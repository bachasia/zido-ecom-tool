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

    // Get revenue data for products (simplified - using order totals)
    const revenueData = await prisma.$queryRaw`
      SELECT 
        p.woo_id as product_id,
        COUNT(o.id) as order_count,
        SUM(o.total) as total_revenue
      FROM products p
      LEFT JOIN orders o ON p.woo_id = o.woo_id AND p.store_id = o.store_id
      WHERE p.store_id = ${store.id}
      GROUP BY p.woo_id
    `

    return NextResponse.json({
      success: true,
      data: {
        products,
        revenueData,
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
