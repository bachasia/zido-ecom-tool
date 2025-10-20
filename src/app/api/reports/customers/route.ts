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
    const sortBy = searchParams.get('sortBy') || 'firstName'
    const sortOrder = searchParams.get('sortOrder') || 'asc'
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

    // Get customers with pagination
    const [customers, totalCount] = await Promise.all([
      prisma.customer.findMany({
        where: { storeId: store.id },
        skip,
        take: limit,
        orderBy: {
          [sortBy]: sortOrder
        }
      }),
      prisma.customer.count({
        where: { storeId: store.id }
      })
    ])

    // Get customer spending data (scoped to store)
    const customerStats = await prisma.$queryRaw`
      SELECT 
        c.wooId as customer_id,
        COUNT(o.id) as order_count,
        SUM(o.total) as total_spent
      FROM customers c
      LEFT JOIN orders o ON c.id = o.customerId
      WHERE c.storeId = ${store.id}
      GROUP BY c.wooId
    `

    // Convert BigInt values to numbers for JSON serialization
    const serializedCustomerStats = customerStats.map((stat: any) => ({
      customer_id: Number(stat.customer_id),
      order_count: Number(stat.order_count),
      total_spent: Number(stat.total_spent)
    }))

    return NextResponse.json({
      success: true,
      data: {
        customers,
        customerStats: serializedCustomerStats,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit)
        }
      }
    })

  } catch (error) {
    console.error('Customers report API error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    )
  }
}
