'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DashboardLayout } from '@/components/dashboard-layout'
import { DataTable } from '@/components/data-table'
import { LoadingState, ErrorState } from '@/components/loading-states'
import { EmptyStoreState } from '@/components/empty-store-state'
import { StoreWrapper } from '@/components/store-wrapper'
import { useStore } from '@/contexts/store-context'

interface Customer {
  id: number
  wooId: number
  firstName: string | null
  lastName: string | null
  email: string | null
  dateCreated: string
  dateUpdated: string
}

interface CustomerStats {
  customer_id: number
  order_count: number
  total_spent: number
}

interface CustomersReportData {
  customers: Customer[]
  customerStats: CustomerStats[]
  pagination: {
    page: number
    limit: number
    totalCount: number
    totalPages: number
  }
}

export default function CustomersReport() {
  return (
    <StoreWrapper>
      <CustomersReportContent />
    </StoreWrapper>
  )
}

function CustomersReportContent() {
  const { currentStoreId } = useStore()
  const [data, setData] = useState<CustomersReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState('firstName')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  const fetchCustomers = async (page: number = 1) => {
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

      const response = await fetch(`/api/reports/customers?${params.toString()}`)
      const result = await response.json()

      if (result.success) {
        setData(result.data)
      } else {
        setError(result.error || 'Failed to fetch customers')
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handlePageChange = (page: number) => {
    fetchCustomers(page)
  }

  const handleSort = (column: string, order: 'asc' | 'desc') => {
    setSortBy(column)
    setSortOrder(order)
    fetchCustomers(1)
  }

  const handleSync = async () => {
    // Sync functionality would be implemented here
    console.log('Sync customers data')
  }

  useEffect(() => {
    fetchCustomers()
  }, [sortBy, sortOrder, currentStoreId])

  const getCustomerStats = (customer: Customer) => {
    const stats = data?.customerStats.find(s => s.customer_id === customer.wooId)
    return {
      orderCount: stats?.order_count || 0,
      totalSpent: stats?.total_spent || 0
    }
  }

  const columns = [
    {
      key: 'wooId',
      label: 'Customer ID',
      sortable: true
    },
    {
      key: 'name',
      label: 'Customer Name',
      sortable: true,
      render: (value: any, row: Customer) => {
        const fullName = [row.firstName, row.lastName].filter(Boolean).join(' ')
        return (
          <div>
            <div className="font-medium">{fullName || 'Unknown'}</div>
            <div className="text-sm text-gray-500">{row.email || 'No email'}</div>
          </div>
        )
      }
    },
    {
      key: 'email',
      label: 'Email',
      sortable: true,
      render: (value: string) => value || 'N/A'
    },
    {
      key: 'orderCount',
      label: 'Orders',
      sortable: false,
      render: (value: any, row: Customer) => {
        const stats = getCustomerStats(row)
        return (
          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
            {stats.orderCount}
          </span>
        )
      }
    },
    {
      key: 'totalSpent',
      label: 'Total Spent',
      sortable: false,
      render: (value: any, row: Customer) => {
        const stats = getCustomerStats(row)
        return (
          <span className="font-medium text-green-600">
            ${stats.totalSpent.toFixed(2)}
          </span>
        )
      }
    },
    {
      key: 'dateCreated',
      label: 'Date Joined',
      sortable: true
    }
  ]

  if (!currentStoreId) {
    return (
      <DashboardLayout onSync={handleSync} syncing={false}>
        <EmptyStoreState 
          title="Chọn một Store ở trên"
          description="Vui lòng chọn một store để xem báo cáo khách hàng"
          buttonText="Tạo Store"
          buttonHref="/stores/new"
        />
      </DashboardLayout>
    )
  }

  if (loading && !data) {
    return (
      <DashboardLayout onSync={handleSync} syncing={false}>
        <LoadingState message="Loading customers report..." />
      </DashboardLayout>
    )
  }

  if (error && !data) {
    return (
      <DashboardLayout onSync={handleSync} syncing={false}>
        <ErrorState 
          title="Failed to load customers report"
          message={error}
          onRetry={() => fetchCustomers()}
        />
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout onSync={handleSync} syncing={false}>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Customers Report</h1>
          <p className="text-gray-600 mt-2">View customer data and spending analytics</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Customers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data?.pagination.totalCount || 0}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${data?.customerStats.reduce((sum, s) => sum + Number(s.total_spent), 0).toFixed(2) || '0.00'}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Average Order Value</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${data?.customerStats.length ? 
                  (data.customerStats.reduce((sum, s) => sum + Number(s.total_spent), 0) / 
                   data.customerStats.reduce((sum, s) => sum + Number(s.order_count), 0)).toFixed(2) : 
                  '0.00'}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Customers Table */}
        {data && (
          <DataTable
            data={data.customers}
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
