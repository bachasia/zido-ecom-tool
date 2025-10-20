'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { DashboardLayout } from '@/components/dashboard-layout'
import { DateRangeFilter, StatusFilter } from '@/components/data-table'
import { LoadingState, ErrorState } from '@/components/loading-states'
import { EmptyStoreState } from '@/components/empty-store-state'
import { StoreWrapper } from '@/components/store-wrapper'
import { useStore } from '@/contexts/store-context'
import OrdersTable from '@/components/orders/orders-table'

interface OrderItem {
  id: string
  wooId: number
  name: string
  quantity: number
  price: number
  total: number
  sku: string | null
  product: {
    id: string
    name: string
    sku: string | null
  } | null
}

interface Customer {
  id: string
  firstName: string | null
  lastName: string | null
  email: string | null
}

interface Order {
  id: string
  wooId: number
  name: string | null
  total: number
  status: string | null
  dateCreated: string
  dateUpdated: string
  billingFirstName: string | null
  billingLastName: string | null
  billingEmail: string | null
  billingPhone: string | null
  billingCompany: string | null
  billingAddress1: string | null
  billingCity: string | null
  billingState: string | null
  billingPostcode: string | null
  billingCountry: string | null
  shippingFirstName: string | null
  shippingLastName: string | null
  shippingCompany: string | null
  shippingAddress1: string | null
  shippingCity: string | null
  shippingState: string | null
  shippingPostcode: string | null
  shippingCountry: string | null
  paymentMethod: string | null
  paymentMethodTitle: string | null
  transactionId: string | null
  currency: string | null
  discountTotal: number | null
  shippingTotal: number | null
  taxTotal: number | null
  subtotal: number | null
  origin: string | null
  source: string | null
  sourceType: string | null
  campaign: string | null
  medium: string | null
  deviceType: string | null
  sessionPageViews: number | null
  utmSource: string | null
  utmMedium: string | null
  utmCampaign: string | null
  utmTerm: string | null
  utmContent: string | null
  referrer: string | null
  landingPage: string | null
  userAgent: string | null
  ipAddress: string | null
  country: string | null
  city: string | null
  customerId: string | null
  storeId: string
  orderItems: OrderItem[]
  customer: Customer | null
}

interface OrdersReportData {
  orders: Order[]
  pagination: {
    page: number
    limit: number
    totalCount: number
    totalPages: number
  }
  filters: {
    statuses: Array<{
      status: string
      count: number
    }>
  }
}

export default function OrdersReport() {
  return (
    <StoreWrapper>
      <OrdersReportContent />
    </StoreWrapper>
  )
}

function OrdersReportContent() {
  const { currentStoreId } = useStore()
  const [data, setData] = useState<OrdersReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState({
    status: '',
    startDate: '',
    endDate: ''
  })
  const [sortBy, setSortBy] = useState('dateCreated')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  const fetchOrders = async (page: number = 1) => {
    if (!currentStoreId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        sortBy,
        sortOrder,
        storeId: currentStoreId
      })

      if (filters.status) params.append('status', filters.status)
      if (filters.startDate) params.append('startDate', filters.startDate)
      if (filters.endDate) params.append('endDate', filters.endDate)

      const response = await fetch(`/api/reports/orders?${params.toString()}`)
      const result = await response.json()

      if (result.success) {
        setData(result.data)
      } else {
        setError(result.error || 'Failed to fetch orders')
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handlePageChange = (page: number) => {
    fetchOrders(page)
  }

  const handleSort = (column: string, order: 'asc' | 'desc') => {
    setSortBy(column)
    setSortOrder(order)
    fetchOrders(1)
  }

  const handleFilterChange = (newFilters: any) => {
    setFilters(newFilters)
    fetchOrders(1)
  }

  const handleSync = async () => {
    // Sync functionality would be implemented here
    console.log('Sync orders data')
  }

  useEffect(() => {
    fetchOrders()
  }, [sortBy, sortOrder, currentStoreId])

  if (!currentStoreId) {
    return (
      <DashboardLayout onSync={handleSync} syncing={false}>
        <EmptyStoreState 
          title="Chọn một Store ở trên"
          description="Vui lòng chọn một store để xem báo cáo đơn hàng"
          buttonText="Tạo Store"
          buttonHref="/stores/new"
        />
      </DashboardLayout>
    )
  }

  if (loading && !data) {
    return (
      <DashboardLayout onSync={handleSync} syncing={false}>
        <LoadingState message="Loading orders report..." />
      </DashboardLayout>
    )
  }

  if (error && !data) {
    return (
      <DashboardLayout onSync={handleSync} syncing={false}>
        <ErrorState 
          title="Failed to load orders report"
          message={error}
          onRetry={() => fetchOrders()}
        />
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout onSync={handleSync} syncing={false}>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Orders Report</h1>
          <p className="text-gray-600 mt-2">View and analyze your order data</p>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
            <CardDescription>Filter orders by status and date range</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 items-end">
              {data?.filters.statuses && (
                <StatusFilter
                  onFilterChange={handleFilterChange}
                  filters={filters}
                  statuses={data.filters.statuses}
                />
              )}
              <DateRangeFilter
                onFilterChange={handleFilterChange}
                filters={filters}
              />
              <Button
                variant="outline"
                onClick={() => {
                  setFilters({ status: '', startDate: '', endDate: '' })
                  fetchOrders(1)
                }}
              >
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Orders Table */}
        {data && (
          <div className="space-y-4">
            <OrdersTable orders={data.orders} />
            
            {/* Pagination */}
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Showing {((data.pagination.page - 1) * data.pagination.limit) + 1} to{' '}
                {Math.min(data.pagination.page * data.pagination.limit, data.pagination.totalCount)} of{' '}
                {data.pagination.totalCount} orders
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(data.pagination.page - 1)}
                  disabled={data.pagination.page <= 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(data.pagination.page + 1)}
                  disabled={data.pagination.page >= data.pagination.totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}