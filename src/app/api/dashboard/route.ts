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

    // Note: dateCreated is stored as INTEGER (Unix timestamp in milliseconds)
    // We use raw SQL queries for all date filtering since Prisma expects DateTime but we store integers
    console.log(`Date filter: ${startDate || 'all'} to ${endDate || 'all'}`)
    if (startDate && endDate) {
      const startTimestamp = new Date(startDate + 'T00:00:00').getTime()
      const endTimestamp = new Date(endDate + 'T23:59:59.999').getTime()
      console.log(`Timestamp filter: ${startTimestamp} to ${endTimestamp}`)
      console.log(`Timestamp dates: ${new Date(startTimestamp).toISOString()} to ${new Date(endTimestamp).toISOString()}`)
    }

    // Get total revenue and orders count using raw SQL (since dateCreated is stored as INTEGER timestamp)
    let revenueResult: any
    let ordersCount: number
    
    if (startDate && endDate) {
      const startTimestamp = new Date(startDate + 'T00:00:00').getTime()
      const endTimestamp = new Date(endDate + 'T23:59:59.999').getTime()
      
      const result: any[] = await prisma.$queryRaw`
        SELECT 
          COALESCE(SUM(total), 0) as totalRevenue,
          COUNT(*) as ordersCount
        FROM orders 
        WHERE storeId = ${store.id}
          AND dateCreated >= ${startTimestamp} 
          AND dateCreated <= ${endTimestamp}
      `
      revenueResult = { _sum: { total: Number(result[0]?.totalRevenue || 0) } }
      ordersCount = Number(result[0]?.ordersCount || 0)
    } else {
      const result: any[] = await prisma.$queryRaw`
        SELECT 
          COALESCE(SUM(total), 0) as totalRevenue,
          COUNT(*) as ordersCount
        FROM orders 
        WHERE storeId = ${store.id}
      `
      revenueResult = { _sum: { total: Number(result[0]?.totalRevenue || 0) } }
      ordersCount = Number(result[0]?.ordersCount || 0)
    }

    // Get distinct customers who placed orders in the selected date range
    // Include both registered customers (by customerId) and guests (by billingEmail)
    const includeGuests = true // Flag to include/exclude guest checkouts
    
    let ordersInRange: any[]
    if (startDate && endDate) {
      const startTimestamp = new Date(startDate + 'T00:00:00').getTime()
      const endTimestamp = new Date(endDate + 'T23:59:59.999').getTime()
      
      ordersInRange = await prisma.$queryRaw`
        SELECT customerId, billingEmail
        FROM orders 
        WHERE storeId = ${store.id}
          AND dateCreated >= ${startTimestamp} 
          AND dateCreated <= ${endTimestamp}
      `
    } else {
      ordersInRange = await prisma.$queryRaw`
        SELECT customerId, billingEmail
        FROM orders 
        WHERE storeId = ${store.id}
      `
    }

    // Collect distinct customerIds (non-null)
    const customerIds = new Set<string>()
    ordersInRange.forEach(order => {
      if (order.customerId) {
        customerIds.add(order.customerId)
      }
    })

    // Collect distinct guest emails (non-null, where customerId is null)
    const guestEmails = new Set<string>()
    if (includeGuests) {
      ordersInRange.forEach(order => {
        if (!order.customerId && order.billingEmail) {
          guestEmails.add(order.billingEmail.toLowerCase())
        }
      })
    }

    // Final count = union of both sets
    const customersCount = customerIds.size + guestEmails.size

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
    // Note: dateCreated is stored as INTEGER (Unix timestamp in milliseconds)
    let dailyRevenue: any[] = []
    if (startDate && endDate) {
      // Reuse timestamp from dateFilter calculation above
      const startTimestamp = new Date(startDate + 'T00:00:00').getTime()
      const endTimestamp = new Date(endDate + 'T23:59:59.999').getTime()
      
      dailyRevenue = await prisma.$queryRaw`
        SELECT 
          DATE(datetime(dateCreated / 1000, 'unixepoch')) as date,
          SUM(total) as revenue
        FROM orders 
        WHERE storeId = ${store.id} 
          AND dateCreated >= ${startTimestamp} 
          AND dateCreated <= ${endTimestamp}
        GROUP BY DATE(datetime(dateCreated / 1000, 'unixepoch'))
        ORDER BY date ASC
      `
    } else {
      dailyRevenue = await prisma.$queryRaw`
        SELECT 
          DATE(datetime(dateCreated / 1000, 'unixepoch')) as date,
          SUM(total) as revenue
        FROM orders 
        WHERE storeId = ${store.id}
        GROUP BY DATE(datetime(dateCreated / 1000, 'unixepoch'))
        ORDER BY date ASC
        LIMIT 30
      `
    }

    // Calculate Average Order Value by day (for bar chart)
    let averageOrderValue: any[] = []
    if (startDate && endDate) {
      // Reuse timestamp from dateFilter calculation above
      const startTimestamp = new Date(startDate + 'T00:00:00').getTime()
      const endTimestamp = new Date(endDate + 'T23:59:59.999').getTime()
      
      averageOrderValue = await prisma.$queryRaw`
        SELECT 
          DATE(datetime(dateCreated / 1000, 'unixepoch')) as date,
          AVG(total) as avgValue,
          COUNT(*) as orderCount
        FROM orders 
        WHERE storeId = ${store.id} 
          AND dateCreated >= ${startTimestamp} 
          AND dateCreated <= ${endTimestamp}
        GROUP BY DATE(datetime(dateCreated / 1000, 'unixepoch'))
        ORDER BY date ASC
      `
    } else {
      averageOrderValue = await prisma.$queryRaw`
        SELECT 
          DATE(datetime(dateCreated / 1000, 'unixepoch')) as date,
          AVG(total) as avgValue,
          COUNT(*) as orderCount
        FROM orders 
        WHERE storeId = ${store.id}
        GROUP BY DATE(datetime(dateCreated / 1000, 'unixepoch'))
        ORDER BY date ASC
        LIMIT 30
      `
    }

    // Convert BigInt to Number for JSON serialization
    const serializedDailyRevenue = dailyRevenue.map((item: any) => ({
      date: item.date,
      revenue: Number(item.revenue || 0)
    }))

    const serializedAverageOrderValue = averageOrderValue.map((item: any) => ({
      date: item.date,
      avgValue: Number(item.avgValue || 0),
      orderCount: Number(item.orderCount || 0)
    }))

    return NextResponse.json({
      success: true,
      data: {
        totalRevenue: revenueResult._sum.total || 0,
        ordersCount,
        customersCount,
        topProducts,
        dailyRevenue: serializedDailyRevenue,
        averageOrderValue: serializedAverageOrderValue
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
