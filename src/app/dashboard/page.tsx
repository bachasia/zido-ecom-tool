'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'
import { format, subDays } from 'date-fns'
import { DashboardLayout } from '@/components/dashboard-layout'
import { KPIGrid } from '@/components/kpi-cards'
import { LoadingState, ErrorState } from '@/components/loading-states'
import { EmptyStoreState } from '@/components/empty-store-state'
import { StoreWrapper } from '@/components/store-wrapper'
import { SyncButton } from '@/components/sync-button'
import { useStore } from '@/contexts/store-context'

interface DashboardData {
  totalRevenue: number
  ordersCount: number
  customersCount: number
  topProducts: Array<{
    id: number
    name: string
    price: number | null
    wooId: number
  }>
  dailyRevenue: Array<{
    date: string
    revenue: number
  }>
  ordersByStatus: Array<{
    status: string
    count: number
  }>
}

type DateRange = '7days' | '30days' | 'custom'

export default function Dashboard() {
  return (
    <StoreWrapper>
      <DashboardContent />
    </StoreWrapper>
  )
}

function DashboardContent() {
  const { currentStoreId } = useStore()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState<DateRange>('30days')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')

  const fetchDashboardData = async () => {
    if (!currentStoreId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      
      let startDate = ''
      let endDate = ''
      
      if (dateRange === '7days') {
        startDate = format(subDays(new Date(), 7), 'yyyy-MM-dd')
        endDate = format(new Date(), 'yyyy-MM-dd')
      } else if (dateRange === '30days') {
        startDate = format(subDays(new Date(), 30), 'yyyy-MM-dd')
        endDate = format(new Date(), 'yyyy-MM-dd')
      } else if (dateRange === 'custom' && customStartDate && customEndDate) {
        startDate = customStartDate
        endDate = customEndDate
      }

      const params = new URLSearchParams()
      if (startDate) params.append('startDate', startDate)
      if (endDate) params.append('endDate', endDate)
      params.append('storeId', currentStoreId)

      const response = await fetch(`/api/dashboard?${params.toString()}`)
      const result = await response.json()

      if (result.success) {
        setData(result.data)
      } else {
        setError(result.error || 'Failed to fetch dashboard data')
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleSyncComplete = () => {
    // Refresh dashboard data after sync completes
    fetchDashboardData()
  }

  useEffect(() => {
    fetchDashboardData()
  }, [dateRange, customStartDate, customEndDate, currentStoreId])

  if (!currentStoreId) {
    return (
      <DashboardLayout>
        <EmptyStoreState 
          title="Chọn một Store ở trên"
          description="Vui lòng chọn một store để xem dashboard analytics"
          buttonText="Tạo Store"
          buttonHref="/stores/new"
        />
      </DashboardLayout>
    )
  }

  if (loading && !data) {
    return (
      <DashboardLayout>
          <LoadingState message="Loading dashboard data..." />
      </DashboardLayout>
    )
  }

  if (error && !data) {
    return (
      <DashboardLayout>
        <ErrorState 
          title="Failed to load dashboard"
          message={error}
          onRetry={fetchDashboardData}
        />
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 mt-2">WooCommerce Analytics Overview</p>
          </div>
          
          {/* Sync Button */}
          {currentStoreId && (
            <div className="w-80">
              <SyncButton 
                storeId={currentStoreId} 
                onSyncComplete={handleSyncComplete}
              />
            </div>
          )}
        </div>

        {/* Date Range Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Date Range Filter</CardTitle>
            <CardDescription>Select the time period for your analytics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex gap-2">
                <Button
                  variant={dateRange === '7days' ? 'default' : 'outline'}
                  onClick={() => setDateRange('7days')}
                  size="sm"
                >
                  Last 7 Days
                </Button>
                <Button
                  variant={dateRange === '30days' ? 'default' : 'outline'}
                  onClick={() => setDateRange('30days')}
                  size="sm"
                >
                  Last 30 Days
                </Button>
                <Button
                  variant={dateRange === 'custom' ? 'default' : 'outline'}
                  onClick={() => setDateRange('custom')}
                  size="sm"
                >
                  Custom Range
                </Button>
              </div>
              
              {dateRange === 'custom' && (
                <div className="flex gap-4">
                  <div>
                    <Label htmlFor="startDate" className="text-sm">Start Date</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="w-40"
                    />
                  </div>
                  <div>
                    <Label htmlFor="endDate" className="text-sm">End Date</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="w-40"
                    />
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* KPI Cards */}
        <KPIGrid 
          data={data || { totalRevenue: 0, ordersCount: 0, customersCount: 0 }} 
          loading={loading}
        />

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Daily Revenue Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Daily Revenue</CardTitle>
              <CardDescription>Revenue trends over time</CardDescription>
            </CardHeader>
            <CardContent>
              {data?.dailyRevenue && data.dailyRevenue.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={data.dailyRevenue}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(value) => format(new Date(value), 'MMM dd')}
                    />
                    <YAxis tickFormatter={(value) => `$${value}`} />
                    <Tooltip 
                      labelFormatter={(value) => format(new Date(value), 'MMM dd, yyyy')}
                      formatter={(value) => [`$${value}`, 'Revenue']}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="#2563eb" 
                      strokeWidth={2}
                      dot={{ fill: '#2563eb' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-gray-500">
                  No revenue data available for the selected period
                </div>
              )}
            </CardContent>
          </Card>

          {/* Orders by Status Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Orders by Status</CardTitle>
              <CardDescription>Order distribution by status</CardDescription>
            </CardHeader>
            <CardContent>
              {data?.ordersByStatus && data.ordersByStatus.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.ordersByStatus}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="status" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-gray-500">
                  No order status data available
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Top Products */}
        <Card>
          <CardHeader>
            <CardTitle>Top 5 Products</CardTitle>
            <CardDescription>Most recent products in your store</CardDescription>
          </CardHeader>
          <CardContent>
            {data?.topProducts && data.topProducts.length > 0 ? (
              <div className="space-y-4">
                {data.topProducts.map((product, index) => (
                  <div key={product.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center space-x-4">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-semibold">{index + 1}</span>
                      </div>
                      <div>
                        <h3 className="font-semibold">{product.name}</h3>
                        <p className="text-sm text-gray-600">ID: {product.wooId}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">
                        {product.price ? `$${product.price.toFixed(2)}` : 'N/A'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No products available
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
