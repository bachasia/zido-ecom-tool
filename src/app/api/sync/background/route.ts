import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { buildWooClient } from '@/lib/woocommerce'
import { decrypt } from '@/lib/crypto'
import { runUnifiedSync } from '@/server/sync/orchestrator'

// In-memory store for sync progress (in production, use Redis or database)
const syncProgress = new Map<string, {
  status: 'running' | 'completed' | 'error'
  progress: number
  message: string
  startTime: number
  endTime?: number
  error?: string
}>()

// POST /api/sync/background -> start background sync
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { storeId } = body

    if (!storeId) {
      return NextResponse.json(
        { error: 'storeId is required' },
        { status: 400 }
      )
    }

    // Check if store exists and user owns it
    const store = await prisma.store.findFirst({
      where: {
        id: storeId,
        ownerId: session.user.id
      }
    })

    if (!store) {
      return NextResponse.json(
        { error: 'Store not found' },
        { status: 404 }
      )
    }

    // Check if sync is already running
    if (syncProgress.has(storeId) && syncProgress.get(storeId)?.status === 'running') {
      return NextResponse.json({
        success: true,
        message: 'Sync already running',
        syncId: storeId
      })
    }

    // Initialize progress tracking
    syncProgress.set(storeId, {
      status: 'running',
      progress: 0,
      message: 'Starting sync...',
      startTime: Date.now()
    })

    // Start background sync (don't await)
    performBackgroundSync(storeId, store)

    return NextResponse.json({
      success: true,
      message: 'Background sync started',
      syncId: storeId
    })

  } catch (error) {
    console.error('Error starting background sync:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET /api/sync/background?storeId=xxx -> get sync progress
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const storeId = searchParams.get('storeId')

    if (!storeId) {
      return NextResponse.json(
        { error: 'storeId is required' },
        { status: 400 }
      )
    }

    // Check if store exists and user owns it
    const store = await prisma.store.findFirst({
      where: {
        id: storeId,
        ownerId: session.user.id
      }
    })

    if (!store) {
      return NextResponse.json(
        { error: 'Store not found' },
        { status: 404 }
      )
    }

    const progress = syncProgress.get(storeId)

    if (!progress) {
      return NextResponse.json({
        success: true,
        data: {
          status: 'idle',
          progress: 0,
          message: 'No sync in progress',
          startTime: null,
          endTime: null
        }
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        status: progress.status,
        progress: progress.progress,
        message: progress.message,
        startTime: progress.startTime,
        endTime: progress.endTime,
        error: progress.error
      }
    })

  } catch (error) {
    console.error('Error getting sync progress:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Background sync function
async function performBackgroundSync(storeId: string, store: any) {
  try {
    const progress = syncProgress.get(storeId)!
    
    // Use unified sync orchestrator with progress callback
    const result = await runUnifiedSync(storeId, (progressValue, message) => {
      const currentProgress = syncProgress.get(storeId)
      if (currentProgress) {
        currentProgress.progress = progressValue
        currentProgress.message = message
        syncProgress.set(storeId, currentProgress)
      }
    })
    
    // Mark as completed
    progress.progress = 100
    progress.message = `Sync complete! Products: ${result.products.count}, Orders: ${result.orders.count}, Customers: ${result.customers.count}`
    progress.status = 'completed'
    progress.endTime = Date.now()
    syncProgress.set(storeId, progress)
    
  } catch (error) {
    console.error('Background sync error:', error)
    const progress = syncProgress.get(storeId)
    if (progress) {
      progress.status = 'error'
      progress.error = error instanceof Error ? error.message : 'Unknown error'
      progress.endTime = Date.now()
      syncProgress.set(storeId, progress)
    }
  }
}

// Legacy background sync function (kept for reference, can be removed later)
async function performBackgroundSyncLegacy(storeId: string, store: any) {
  try {
    const progress = syncProgress.get(storeId)!
    
    // Update progress: Decrypting credentials
    progress.progress = 10
    progress.message = 'Decrypting credentials...'
    syncProgress.set(storeId, progress)

    // Decrypt credentials
    const decryptedKey = decrypt({
      iv: store.consumerKeyIv,
      tag: store.consumerKeyTag,
      ciphertext: store.consumerKeyCiphertext
    })
    
    const decryptedSecret = decrypt({
      iv: store.consumerSecretIv,
      tag: store.consumerSecretTag,
      ciphertext: store.consumerSecretCiphertext
    })

    // Update progress: Building WooCommerce client
    progress.progress = 20
    progress.message = 'Connecting to WooCommerce...'
    syncProgress.set(storeId, progress)

    // Build WooCommerce client
    const wooClient = buildWooClient({
      url: store.url,
      key: decryptedKey,
      secret: decryptedSecret
    })

    // Update progress: Fetching orders
    progress.progress = 30
    progress.message = 'Fetching orders...'
    syncProgress.set(storeId, progress)

    // Fetch orders
    const orders = await wooClient.getOrders()
    
    // Update progress: Syncing orders
    progress.progress = 50
    progress.message = `Syncing ${orders.length} orders...`
    syncProgress.set(storeId, progress)

    let ordersCount = 0
    for (const order of orders) {
      try {
        // Find customer for this order
        let customerId = null
        if (order.customer_id) {
          const customer = await prisma.customer.findFirst({
            where: {
              storeId: store.id,
              wooId: order.customer_id
            }
          })
          customerId = customer?.id || null
        }

        await prisma.order.upsert({
          where: { 
            storeId_wooId: {
              storeId: store.id,
              wooId: order.id
            }
          },
          update: {
            name: order.number || null,
            total: parseFloat(order.total) || 0,
            status: order.status || null,
            dateCreated: new Date(order.date_created),
            dateUpdated: new Date(order.date_modified),
            
            // Billing details
            billingFirstName: order.billing?.first_name || null,
            billingLastName: order.billing?.last_name || null,
            billingEmail: order.billing?.email || null,
            billingPhone: order.billing?.phone || null,
            billingCompany: order.billing?.company || null,
            billingAddress1: order.billing?.address_1 || null,
            billingAddress2: order.billing?.address_2 || null,
            billingCity: order.billing?.city || null,
            billingState: order.billing?.state || null,
            billingPostcode: order.billing?.postcode || null,
            billingCountry: order.billing?.country || null,
            
            // Shipping details
            shippingFirstName: order.shipping?.first_name || null,
            shippingLastName: order.shipping?.last_name || null,
            shippingCompany: order.shipping?.company || null,
            shippingAddress1: order.shipping?.address_1 || null,
            shippingAddress2: order.shipping?.address_2 || null,
            shippingCity: order.shipping?.city || null,
            shippingState: order.shipping?.state || null,
            shippingPostcode: order.shipping?.postcode || null,
            shippingCountry: order.shipping?.country || null,
            
            // Payment details
            paymentMethod: order.payment_method || null,
            paymentMethodTitle: order.payment_method_title || null,
            transactionId: order.transaction_id || null,
            
            // Order attribution
            currency: order.currency || null,
            discountTotal: parseFloat(order.discount_total) || null,
            shippingTotal: parseFloat(order.shipping_total) || null,
            taxTotal: parseFloat(order.total_tax) || null,
            subtotal: parseFloat(order.subtotal) || null,
            
            // Marketing Attribution & Analytics
            origin: order.origin || null,
            source: order.source || null,
            sourceType: order.source_type || null,
            campaign: order.campaign || null,
            medium: order.medium || null,
            deviceType: order.device_type || null,
            sessionPageViews: parseInt(order.session_page_views) || null,
            utmSource: order.utm_source || null,
            utmMedium: order.utm_medium || null,
            utmCampaign: order.utm_campaign || null,
            utmTerm: order.utm_term || null,
            utmContent: order.utm_content || null,
            referrer: order.referrer || null,
            landingPage: order.landing_page || null,
            userAgent: order.user_agent || null,
            ipAddress: order.ip_address || null,
            country: order.country || null,
            city: order.city || null,
            
            // Customer relationship
            customerId: customerId
          },
          create: {
            storeId: store.id,
            wooId: order.id,
            name: order.number || null,
            total: parseFloat(order.total) || 0,
            status: order.status || null,
            dateCreated: new Date(order.date_created),
            dateUpdated: new Date(order.date_modified),
            
            // Billing details
            billingFirstName: order.billing?.first_name || null,
            billingLastName: order.billing?.last_name || null,
            billingEmail: order.billing?.email || null,
            billingPhone: order.billing?.phone || null,
            billingCompany: order.billing?.company || null,
            billingAddress1: order.billing?.address_1 || null,
            billingAddress2: order.billing?.address_2 || null,
            billingCity: order.billing?.city || null,
            billingState: order.billing?.state || null,
            billingPostcode: order.billing?.postcode || null,
            billingCountry: order.billing?.country || null,
            
            // Shipping details
            shippingFirstName: order.shipping?.first_name || null,
            shippingLastName: order.shipping?.last_name || null,
            shippingCompany: order.shipping?.company || null,
            shippingAddress1: order.shipping?.address_1 || null,
            shippingAddress2: order.shipping?.address_2 || null,
            shippingCity: order.shipping?.city || null,
            shippingState: order.shipping?.state || null,
            shippingPostcode: order.shipping?.postcode || null,
            shippingCountry: order.shipping?.country || null,
            
            // Payment details
            paymentMethod: order.payment_method || null,
            paymentMethodTitle: order.payment_method_title || null,
            transactionId: order.transaction_id || null,
            
            // Order attribution
            currency: order.currency || null,
            discountTotal: parseFloat(order.discount_total) || null,
            shippingTotal: parseFloat(order.shipping_total) || null,
            taxTotal: parseFloat(order.total_tax) || null,
            subtotal: parseFloat(order.subtotal) || null,
            
            // Marketing Attribution & Analytics
            origin: order.origin || null,
            source: order.source || null,
            sourceType: order.source_type || null,
            campaign: order.campaign || null,
            medium: order.medium || null,
            deviceType: order.device_type || null,
            sessionPageViews: parseInt(order.session_page_views) || null,
            utmSource: order.utm_source || null,
            utmMedium: order.utm_medium || null,
            utmCampaign: order.utm_campaign || null,
            utmTerm: order.utm_term || null,
            utmContent: order.utm_content || null,
            referrer: order.referrer || null,
            landingPage: order.landing_page || null,
            userAgent: order.user_agent || null,
            ipAddress: order.ip_address || null,
            country: order.country || null,
            city: order.city || null,
            
            // Customer relationship
            customerId: customerId
          }
        })

        // Sync order items
        if (order.line_items && Array.isArray(order.line_items)) {
          // Get the created/updated order to get its ID
          const dbOrder = await prisma.order.findFirst({
            where: {
              storeId: store.id,
              wooId: order.id
            }
          })

          if (dbOrder) {
            for (const item of order.line_items) {
              try {
                // Find product for this order item
                let productId = null
                if (item.product_id) {
                  const product = await prisma.product.findFirst({
                    where: {
                      storeId: store.id,
                      wooId: item.product_id
                    }
                  })
                  productId = product?.id || null
                }

                await prisma.orderItem.upsert({
                  where: {
                    orderId_wooId: {
                      orderId: dbOrder.id,
                      wooId: item.id
                    }
                  },
                  update: {
                    name: item.name || '',
                    quantity: parseInt(item.quantity) || 0,
                    price: parseFloat(item.price) || 0,
                    total: parseFloat(item.total) || 0,
                    sku: item.sku || null,
                    productId: productId
                  },
                  create: {
                    orderId: dbOrder.id,
                    wooId: item.id,
                    name: item.name || '',
                    quantity: parseInt(item.quantity) || 0,
                    price: parseFloat(item.price) || 0,
                    total: parseFloat(item.total) || 0,
                    sku: item.sku || null,
                    productId: productId
                  }
                })
              } catch (itemError) {
                console.error(`Error syncing order item ${item.id}:`, itemError)
              }
            }
          }
        }

        ordersCount++
        
        // Update progress for orders
        const orderProgress = 50 + (ordersCount / orders.length) * 20
        progress.progress = Math.min(orderProgress, 70)
        progress.message = `Synced ${ordersCount}/${orders.length} orders...`
        syncProgress.set(storeId, progress)
      } catch (error) {
        console.error(`Error syncing order ${order.id}:`, error)
      }
    }

    // Update progress: Fetching products
    progress.progress = 70
    progress.message = 'Fetching products...'
    syncProgress.set(storeId, progress)

    // Fetch and sync products
    const products = await wooClient.getProducts()
    
    progress.progress = 80
    progress.message = `Syncing ${products.length} products...`
    syncProgress.set(storeId, progress)

    let productsCount = 0
    for (const product of products) {
      try {
        // Extract featured image URL from images array
        const imageUrl = product.images && product.images.length > 0 
          ? product.images[0].src 
          : null
        
        const productData = {
          name: product.name || '',
          sku: product.sku || null,
          price: parseFloat(product.price) || null,
          status: product.status || 'draft',
          description: product.short_description || null,
          imageUrl: imageUrl,
          totalSalesWoo: product.total_sales || null,
          dateCreated: new Date(product.date_created),
          dateUpdated: new Date(product.date_modified)
        }
        
        await prisma.product.upsert({
          where: {
            storeId_wooId: {
              storeId: store.id,
              wooId: product.id
            }
          },
          update: productData,
          create: {
            ...productData,
            storeId: store.id,
            wooId: product.id
          }
        })
        
        productsCount++
        
        // Update progress for products
        const productProgress = 80 + (productsCount / products.length) * 10
        progress.progress = Math.min(productProgress, 90)
        progress.message = `Synced ${productsCount}/${products.length} products...`
        syncProgress.set(storeId, progress)
      } catch (error) {
        console.error(`Error syncing product ${product.id}:`, error)
      }
    }

    // Update progress: Fetching customers
    progress.progress = 90
    progress.message = 'Fetching customers...'
    syncProgress.set(storeId, progress)

    // Fetch and sync customers
    const customers = await wooClient.getCustomers()
    
    progress.progress = 95
    progress.message = `Syncing ${customers.length} customers...`
    syncProgress.set(storeId, progress)

    let customersCount = 0
    for (const customer of customers) {
      try {
        await prisma.customer.upsert({
          where: {
            storeId_wooId: {
              storeId: store.id,
              wooId: customer.id
            }
          },
          update: {
            firstName: customer.first_name || '',
            lastName: customer.last_name || '',
            email: customer.email || '',
            dateCreated: new Date(customer.date_created),
            dateUpdated: new Date(customer.date_modified)
          },
          create: {
            storeId: store.id,
            wooId: customer.id,
            firstName: customer.first_name || '',
            lastName: customer.last_name || '',
            email: customer.email || '',
            dateCreated: new Date(customer.date_created),
            dateUpdated: new Date(customer.date_modified)
          }
        })
        
        customersCount++
      } catch (error) {
        console.error(`Error syncing customer ${customer.id}:`, error)
      }
    }

    // Update totalSold for all products based on OrderItem aggregates
    console.log('Calculating totalSold from OrderItem aggregates...')
    const soldProducts: any[] = await prisma.$queryRaw`
      SELECT 
        productId,
        SUM(quantity) as total_quantity
      FROM order_items
      WHERE productId IN (
        SELECT id FROM products WHERE storeId = ${store.id}
      )
      GROUP BY productId
    `
    
    for (const item of soldProducts) {
      try {
        await prisma.product.update({
          where: { id: item.productId },
          data: { totalSold: Number(item.total_quantity || 0) }
        })
      } catch (error) {
        console.error(`Error updating totalSold for product ${item.productId}:`, error)
      }
    }

    // Complete sync
    progress.progress = 100
    progress.status = 'completed'
    progress.message = `Sync completed! Synced ${ordersCount} orders, ${productsCount} products, ${customersCount} customers`
    progress.endTime = Date.now()
    syncProgress.set(storeId, progress)

    // Clean up after 5 minutes
    setTimeout(() => {
      syncProgress.delete(storeId)
    }, 5 * 60 * 1000)

  } catch (error) {
    console.error('Background sync error:', error)
    
    const progress = syncProgress.get(storeId)
    if (progress) {
      progress.status = 'error'
      progress.message = 'Sync failed'
      progress.error = error instanceof Error ? error.message : 'Unknown error'
      progress.endTime = Date.now()
      syncProgress.set(storeId, progress)
    }
  }
}

