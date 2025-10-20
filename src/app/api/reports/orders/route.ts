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
    const sortBy = searchParams.get('sortBy') || 'dateCreated'
    const sortOrder = searchParams.get('sortOrder') || 'desc'
    const status = searchParams.get('status')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
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
    if (startDate && endDate) {
      where.dateCreated = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      }
    }

    // Get orders with pagination and include relationships
    const [orders, totalCount] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          [sortBy]: sortOrder
        },
        include: {
          orderItems: {
            include: {
              product: true
            }
          },
          customer: true
        }
      }),
      prisma.order.count({ where })
    ])

    // Get order statuses for filter (scoped to store)
    const statuses = await prisma.order.groupBy({
      by: ['status'],
      where: { storeId: store.id },
      _count: {
        status: true
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        orders,
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
    console.error('Orders report API error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    )
  }
}
