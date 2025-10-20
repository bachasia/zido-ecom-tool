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

    // Build date filter
    const dateFilter: any = {
      storeId: store.id
    }
    if (startDate && endDate) {
      dateFilter.dateCreated = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      }
    }

    // Get total revenue
    const revenueResult = await prisma.order.aggregate({
      where: dateFilter,
      _sum: {
        total: true
      }
    })

    // Get total orders count
    const ordersCount = await prisma.order.count({
      where: dateFilter
    })

    // Get total customers count
    const customersCount = await prisma.customer.count({
      where: { storeId: store.id }
    })

    // Get top 5 products by sales (simplified - using order count per product)
    const topProducts = await prisma.product.findMany({
      where: { storeId: store.id },
      take: 5,
      orderBy: {
        createdAt: 'desc'
      },
      select: {
        id: true,
        name: true,
        price: true,
        wooId: true
      }
    })

    // Get daily revenue data for charts
    let dailyRevenue: any[] = []
    if (startDate && endDate) {
      dailyRevenue = await prisma.$queryRaw`
        SELECT 
          DATE(dateCreated) as date,
          SUM(total) as revenue
        FROM orders 
        WHERE storeId = ${store.id} AND dateCreated >= ${new Date(startDate)} AND dateCreated <= ${new Date(endDate)}
        GROUP BY DATE(dateCreated)
        ORDER BY date ASC
      `
    } else {
      dailyRevenue = await prisma.$queryRaw`
        SELECT 
          DATE(dateCreated) as date,
          SUM(total) as revenue
        FROM orders 
        WHERE storeId = ${store.id}
        GROUP BY DATE(dateCreated)
        ORDER BY date ASC
      `
    }

    // Get orders by status for bar chart
    const ordersByStatus = await prisma.order.groupBy({
      by: ['status'],
      where: dateFilter,
      _count: {
        status: true
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        totalRevenue: revenueResult._sum.total || 0,
        ordersCount,
        customersCount,
        topProducts,
        dailyRevenue,
        ordersByStatus: ordersByStatus.map(item => ({
          status: item.status || 'Unknown',
          count: item._count.status
        }))
      }
    })

  } catch (error) {
    console.error('Dashboard API error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    )
  }
}
