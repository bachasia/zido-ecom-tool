import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const sortBy = searchParams.get('sortBy') || 'name'
    const sortOrder = searchParams.get('sortOrder') || 'asc'
    const status = searchParams.get('status')
    const storeId = searchParams.get('storeId')

    if (!storeId) {
      return NextResponse.json(
        { error: 'storeId required' },
        { status: 400 }
      )
    }

    // Look up store by id and verify ownership
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

    const skip = (page - 1) * limit

    // Build where clause
    const where: any = {
      storeId: store.id
    }
    if (status) {
      where.status = status
    }

    // Get products with pagination
    const [products, totalCount] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          [sortBy]: sortOrder
        }
      }),
      prisma.product.count({ where })
    ])

    // Get product statuses for filter (scoped to store)
    const statuses = await prisma.product.groupBy({
      by: ['status'],
      where: { storeId: store.id },
      _count: {
        status: true
      }
    })

    // Get revenue data for products from OrderItem table
    const revenueData: any[] = await prisma.$queryRaw`
      SELECT 
        p.wooId as product_id,
        p.name as product_name,
        COUNT(DISTINCT oi.orderId) as order_count,
        SUM(oi.total) as total_revenue,
        SUM(oi.quantity) as total_quantity
      FROM products p
      LEFT JOIN order_items oi ON p.id = oi.productId
      WHERE p.storeId = ${store.id}
      GROUP BY p.wooId, p.name
    `
    
    // Convert BigInt values to Number for JSON serialization
    const serializedRevenueData = revenueData.map((item: any) => ({
      product_id: Number(item.product_id),
      product_name: item.product_name,
      order_count: Number(item.order_count || 0),
      total_revenue: Number(item.total_revenue || 0),
      total_quantity: Number(item.total_quantity || 0)
    }))

    return NextResponse.json({
      success: true,
      data: {
        products,
        revenueData: serializedRevenueData,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit)
        },
        filters: {
          statuses: statuses.map(s => ({
            status: s.status || 'Unknown',
            count: s._count.status
          }))
        }
      }
    })

  } catch (error) {
    console.error('Products report API error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    )
  }
}
