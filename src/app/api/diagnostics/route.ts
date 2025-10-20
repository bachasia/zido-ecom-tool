import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * Diagnostics API
 * Reports sync issues and data integrity problems for a store
 * 
 * GET /api/diagnostics?storeId=<id>
 * 
 * Returns:
 * - orphanOrderItems: Order items that reference non-existent products
 * - missingProducts: Products referenced in orders but not in products table
 * - productMismatches: Products with discrepancies between totalSalesWoo and totalSold
 * - storeStats: Overall statistics about the store's data
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const storeId = searchParams.get('storeId')

    if (!storeId) {
      return NextResponse.json(
        { error: 'storeId required' },
        { status: 400 }
      )
    }

    // Verify store ownership
    const store = await prisma.store.findFirst({
      where: {
        id: storeId,
        ownerId: session.user.id
      }
    })

    if (!store) {
      return NextResponse.json(
        { error: 'Store not found or access denied' },
        { status: 404 }
      )
    }

    // 1. Find orphan order items (items pointing to non-existent products)
    const orphanOrderItems: any[] = await prisma.$queryRaw`
      SELECT 
        oi.id,
        oi.wooId,
        oi.name as item_name,
        oi.quantity,
        oi.total,
        oi.productId,
        o.wooId as order_wooId,
        o.dateCreated as order_date
      FROM order_items oi
      INNER JOIN orders o ON oi.orderId = o.id
      LEFT JOIN products p ON oi.productId = p.id
      WHERE o.storeId = ${store.id}
        AND p.id IS NULL
      ORDER BY o.dateCreated DESC
      LIMIT 100
    `

    // 2. Find products with missing or mismatched data
    const productIssues: any[] = await prisma.$queryRaw`
      SELECT 
        p.id,
        p.wooId,
        p.name,
        p.totalSalesWoo,
        p.totalSold,
        p.imageUrl,
        p.sku,
        CASE 
          WHEN p.imageUrl IS NULL THEN 1 
          ELSE 0 
        END as missing_image,
        CASE 
          WHEN p.sku IS NULL THEN 1 
          ELSE 0 
        END as missing_sku,
        CASE
          WHEN p.totalSalesWoo IS NOT NULL AND p.totalSold IS NOT NULL 
            AND ABS(p.totalSalesWoo - p.totalSold) > 5 
          THEN 1
          ELSE 0
        END as sales_mismatch
      FROM products p
      WHERE p.storeId = ${store.id}
        AND (
          p.imageUrl IS NULL 
          OR p.sku IS NULL 
          OR (p.totalSalesWoo IS NOT NULL AND p.totalSold IS NOT NULL 
              AND ABS(p.totalSalesWoo - p.totalSold) > 5)
        )
      ORDER BY p.name
      LIMIT 100
    `

    // 3. Get overall store statistics
    const storeStats = await prisma.$queryRaw`
      SELECT 
        (SELECT COUNT(*) FROM products WHERE storeId = ${store.id}) as total_products,
        (SELECT COUNT(*) FROM products WHERE storeId = ${store.id} AND imageUrl IS NOT NULL) as products_with_images,
        (SELECT COUNT(*) FROM products WHERE storeId = ${store.id} AND sku IS NOT NULL) as products_with_sku,
        (SELECT COUNT(*) FROM products WHERE storeId = ${store.id} AND totalSalesWoo IS NOT NULL) as products_with_woo_sales,
        (SELECT COUNT(*) FROM products WHERE storeId = ${store.id} AND totalSold IS NOT NULL) as products_with_calculated_sales,
        (SELECT COUNT(*) FROM orders WHERE storeId = ${store.id}) as total_orders,
        (SELECT COUNT(*) FROM order_items WHERE orderId IN (SELECT id FROM orders WHERE storeId = ${store.id})) as total_order_items,
        (SELECT COUNT(*) FROM customers WHERE storeId = ${store.id}) as total_customers
    `

    // 4. Find products referenced in order items but missing from products table
    const missingProducts: any[] = await prisma.$queryRaw`
      SELECT DISTINCT
        oi.name as product_name,
        oi.sku as product_sku,
        COUNT(*) as order_count,
        SUM(oi.quantity) as total_quantity,
        SUM(oi.total) as total_revenue
      FROM order_items oi
      INNER JOIN orders o ON oi.orderId = o.id
      LEFT JOIN products p ON oi.productId = p.id
      WHERE o.storeId = ${store.id}
        AND p.id IS NULL
      GROUP BY oi.name, oi.sku
      ORDER BY total_revenue DESC
      LIMIT 50
    `

    // Convert BigInt values to Number for JSON serialization
    const serializedOrphanItems = orphanOrderItems.map((item: any) => ({
      ...item,
      quantity: Number(item.quantity || 0),
      total: Number(item.total || 0),
      order_wooId: Number(item.order_wooId || 0)
    }))

    const serializedProductIssues = productIssues.map((p: any) => ({
      id: p.id,
      wooId: Number(p.wooId || 0),
      name: p.name,
      totalSalesWoo: p.totalSalesWoo ? Number(p.totalSalesWoo) : null,
      totalSold: p.totalSold ? Number(p.totalSold) : null,
      imageUrl: p.imageUrl,
      sku: p.sku,
      missingImage: Boolean(p.missing_image),
      missingSku: Boolean(p.missing_sku),
      salesMismatch: Boolean(p.sales_mismatch)
    }))

    const serializedMissingProducts = missingProducts.map((p: any) => ({
      product_name: p.product_name,
      product_sku: p.product_sku,
      order_count: Number(p.order_count || 0),
      total_quantity: Number(p.total_quantity || 0),
      total_revenue: Number(p.total_revenue || 0)
    }))

    const stats = storeStats[0]
    const serializedStats = {
      total_products: Number(stats.total_products || 0),
      products_with_images: Number(stats.products_with_images || 0),
      products_with_sku: Number(stats.products_with_sku || 0),
      products_with_woo_sales: Number(stats.products_with_woo_sales || 0),
      products_with_calculated_sales: Number(stats.products_with_calculated_sales || 0),
      total_orders: Number(stats.total_orders || 0),
      total_order_items: Number(stats.total_order_items || 0),
      total_customers: Number(stats.total_customers || 0),
      image_completion_rate: stats.total_products > 0 
        ? ((Number(stats.products_with_images) / Number(stats.total_products)) * 100).toFixed(1) 
        : '0.0',
      sku_completion_rate: stats.total_products > 0 
        ? ((Number(stats.products_with_sku) / Number(stats.total_products)) * 100).toFixed(1) 
        : '0.0'
    }

    return NextResponse.json({
      success: true,
      storeId: store.id,
      storeName: store.name,
      diagnostics: {
        orphanOrderItems: serializedOrphanItems,
        productIssues: serializedProductIssues,
        missingProducts: serializedMissingProducts,
        storeStats: serializedStats
      },
      summary: {
        orphan_items_count: serializedOrphanItems.length,
        product_issues_count: serializedProductIssues.length,
        missing_products_count: serializedMissingProducts.length,
        health_score: calculateHealthScore(serializedStats, serializedOrphanItems.length, serializedProductIssues.length)
      }
    })

  } catch (error) {
    console.error('Diagnostics API error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    )
  }
}

/**
 * Calculate a health score (0-100) based on data quality
 */
function calculateHealthScore(
  stats: any,
  orphanCount: number,
  issuesCount: number
): number {
  let score = 100

  // Deduct for orphan items (max -20 points)
  if (orphanCount > 0) {
    score -= Math.min(orphanCount * 2, 20)
  }

  // Deduct for product issues (max -20 points)
  if (issuesCount > 0) {
    score -= Math.min(issuesCount * 0.5, 20)
  }

  // Deduct for missing images (max -20 points)
  if (stats.total_products > 0) {
    const imageRate = parseFloat(stats.image_completion_rate)
    score -= (100 - imageRate) * 0.2
  }

  // Deduct for missing SKUs (max -20 points)
  if (stats.total_products > 0) {
    const skuRate = parseFloat(stats.sku_completion_rate)
    score -= (100 - skuRate) * 0.2
  }

  // Deduct for missing sales data (max -20 points)
  if (stats.total_products > 0) {
    const salesRate = (stats.products_with_calculated_sales / stats.total_products) * 100
    score -= (100 - salesRate) * 0.2
  }

  return Math.max(0, Math.round(score))
}

