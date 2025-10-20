'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { DashboardLayout } from '@/components/dashboard-layout'
import { DataTable, DateRangeFilter, StatusFilter } from '@/components/data-table'
import { LoadingState, ErrorState } from '@/components/loading-states'
import { EmptyStoreState } from '@/components/empty-store-state'
import { StoreWrapper } from '@/components/store-wrapper'
import { useStore } from '@/contexts/store-context'
import Link from 'next/link'

interface Order {
  id: number
  wooId: number
  name: string | null
  total: number
  status: string | null
  dateCreated: string
  dateUpdated: string
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

  const columns = [
    {
      key: 'wooId',
      label: 'Order ID',
      sortable: true
    },
    {
      key: 'name',
      label: 'Order Number',
      sortable: true
    },
    {
      key: 'total',
      label: 'Total',
      sortable: true,
      render: (value: number) => `$${value.toFixed(2)}`
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (value: string) => (
        <span className={`px-2 py-1 text-xs rounded-full ${
          value === 'completed' ? 'bg-green-100 text-green-800' :
          value === 'pending' ? 'bg-yellow-100 text-yellow-800' :
          value === 'cancelled' ? 'bg-red-100 text-red-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {value || 'Unknown'}
        </span>
      )
    },
    {
      key: 'dateCreated',
      label: 'Date Created',
      sortable: true
    }
  ]

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
          <DataTable
            data={data.orders}
            columns={columns}
            pagination={data.pagination}
            onPageChange={handlePageChange}
            onSort={handleSort}
            loading={loading}
          />
        )}
      </div>
    </DashboardLayout>
  )
}
