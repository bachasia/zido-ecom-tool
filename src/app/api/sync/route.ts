import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { buildWooClient } from '@/lib/woocommerce'
import { prisma } from '@/lib/prisma'
import { decrypt } from '@/lib/crypto'

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get storeId from query params or request body
    const url = new URL(request.url)
    const queryStoreId = url.searchParams.get('storeId')
    
    let requestBody: { storeId?: string } = {}
    try {
      requestBody = await request.json()
    } catch {
      // Ignore JSON parse errors, use query params
    }

    const storeId = queryStoreId || requestBody.storeId
    if (!storeId) {
      return NextResponse.json(
        { error: 'storeId required' },
        { status: 400 }
      )
    }

    console.log(`Starting WooCommerce sync for store ${storeId}...`)

    // Look up store by id and verify ownership
    const store = await prisma.store.findFirst({
      where: {
        id: storeId,
        ownerId: session.user.id
      },
      select: {
        id: true,
        name: true,
        url: true,
        consumerKeyCiphertext: true,
        consumerKeyIv: true,
        consumerKeyTag: true,
        consumerSecretCiphertext: true,
        consumerSecretIv: true,
        consumerSecretTag: true
      }
    })

    if (!store) {
      return NextResponse.json(
        { error: 'Store not found or access denied' },
        { status: 404 }
      )
    }

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

    // Build WooCommerce client with decrypted credentials
    const wooClient = buildWooClient({
      url: store.url,
      key: decryptedKey,
      secret: decryptedSecret,
    })

    // Fetch data from WooCommerce API
    const [orders, products, customers] = await Promise.all([
      wooClient.getOrders(),
      wooClient.getProducts(),
      wooClient.getCustomers()
    ])

    console.log(`Fetched ${orders.length} orders, ${products.length} products, ${customers.length} customers`)

    // Sync orders with detailed information
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
      } catch (error) {
        console.error(`Error syncing order ${order.id}:`, error)
      }
    }

    // Sync products
    let productsCount = 0
    for (const product of products) {
      try {
        await prisma.product.upsert({
          where: { 
            storeId_wooId: {
              storeId: store.id,
              wooId: product.id
            }
          },
          update: {
            name: product.name,
            price: parseFloat(product.price) || null,
            status: product.status || null,
            dateCreated: new Date(product.date_created),
            dateUpdated: new Date(product.date_modified)
          },
          create: {
            storeId: store.id,
            wooId: product.id,
            name: product.name,
            price: parseFloat(product.price) || null,
            status: product.status || null,
            dateCreated: new Date(product.date_created),
            dateUpdated: new Date(product.date_modified)
          }
        })
        productsCount++
      } catch (error) {
        console.error(`Error syncing product ${product.id}:`, error)
      }
    }

    // Sync customers
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
            firstName: customer.first_name || null,
            lastName: customer.last_name || null,
            email: customer.email || null,
            dateCreated: new Date(customer.date_created),
            dateUpdated: new Date(customer.date_modified)
          },
          create: {
            storeId: store.id,
            wooId: customer.id,
            firstName: customer.first_name || null,
            lastName: customer.last_name || null,
            email: customer.email || null,
            dateCreated: new Date(customer.date_created),
            dateUpdated: new Date(customer.date_modified)
          }
        })
        customersCount++
      } catch (error) {
        console.error(`Error syncing customer ${customer.id}:`, error)
      }
    }

    console.log(`Sync completed for store ${store.name}: ${ordersCount} orders, ${productsCount} products, ${customersCount} customers`)

    return NextResponse.json({
      success: true,
      storeId: store.id,
      storeName: store.name,
      ordersCount,
      productsCount,
      customersCount,
      message: `Sync completed successfully for ${store.name}`
    })

  } catch (error) {
    console.error('Sync failed:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        ordersCount: 0,
        productsCount: 0,
        customersCount: 0
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Use POST method to trigger sync',
    endpoint: '/api/sync'
  })
}
