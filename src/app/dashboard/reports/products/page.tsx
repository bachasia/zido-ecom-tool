'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { DashboardLayout } from '@/components/dashboard-layout'
import { DataTable, StatusFilter } from '@/components/data-table'
import { LoadingState, ErrorState } from '@/components/loading-states'
import { EmptyStoreState } from '@/components/empty-store-state'
import { StoreWrapper } from '@/components/store-wrapper'
import { useStore } from '@/contexts/store-context'

interface Product {
  id: number
  wooId: number
  name: string
  price: number | null
  status: string | null
  dateCreated: string
  dateUpdated: string
}

interface RevenueData {
  product_id: number
  order_count: number
  total_revenue: number
}

interface ProductsReportData {
  products: Product[]
  revenueData: RevenueData[]
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

export default function ProductsReport() {
  return (
    <StoreWrapper>
      <ProductsReportContent />
    </StoreWrapper>
  )
}

function ProductsReportContent() {
  const { currentStoreId } = useStore()
  const [data, setData] = useState<ProductsReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState({
    status: ''
  })
  const [sortBy, setSortBy] = useState('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  const fetchProducts = async (page: number = 1) => {
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

      const response = await fetch(`/api/reports/products?${params.toString()}`)
      const result = await response.json()

      if (result.success) {
        setData(result.data)
      } else {
        setError(result.error || 'Failed to fetch products')
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handlePageChange = (page: number) => {
    fetchProducts(page)
  }

  const handleSort = (column: string, order: 'asc' | 'desc') => {
    setSortBy(column)
    setSortOrder(order)
    fetchProducts(1)
  }

  const handleFilterChange = (newFilters: any) => {
    setFilters(newFilters)
    fetchProducts(1)
  }

  const handleSync = async () => {
    // Sync functionality would be implemented here
    console.log('Sync products data')
  }

  useEffect(() => {
    fetchProducts()
  }, [sortBy, sortOrder, currentStoreId])

  const getProductStats = (product: Product) => {
    const stats = data?.revenueData.find(r => r.product_id === product.wooId)
    return {
      orderCount: stats?.order_count || 0,
      totalRevenue: stats?.total_revenue || 0
    }
  }

  const columns = [
    {
      key: 'wooId',
      label: 'Product ID',
      sortable: true
    },
    {
      key: 'name',
      label: 'Product Name',
      sortable: true,
      render: (value: string, row: Product) => (
        <div>
          <div className="font-medium">{value}</div>
          <div className="text-sm text-gray-500">ID: {row.wooId}</div>
        </div>
      )
    },
    {
      key: 'price',
      label: 'Price',
      sortable: true,
      render: (value: number) => value ? `$${value.toFixed(2)}` : 'N/A'
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (value: string) => (
        <span className={`px-2 py-1 text-xs rounded-full ${
          value === 'publish' ? 'bg-green-100 text-green-800' :
          value === 'draft' ? 'bg-yellow-100 text-yellow-800' :
          value === 'private' ? 'bg-gray-100 text-gray-800' :
          'bg-red-100 text-red-800'
        }`}>
          {value || 'Unknown'}
        </span>
      )
    },
    {
      key: 'orderCount',
      label: 'Orders',
      sortable: false,
      render: (value: any, row: Product) => {
        const stats = getProductStats(row)
        return stats.orderCount
      }
    },
    {
      key: 'totalRevenue',
      label: 'Revenue',
      sortable: false,
      render: (value: any, row: Product) => {
        const stats = getProductStats(row)
        return `$${stats.totalRevenue.toFixed(2)}`
      }
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
          description="Vui lòng chọn một store để xem báo cáo sản phẩm"
          buttonText="Tạo Store"
          buttonHref="/stores/new"
        />
      </DashboardLayout>
    )
  }

  if (loading && !data) {
    return (
      <DashboardLayout onSync={handleSync} syncing={false}>
        <LoadingState message="Loading products report..." />
      </DashboardLayout>
    )
  }

  if (error && !data) {
    return (
      <DashboardLayout onSync={handleSync} syncing={false}>
        <ErrorState 
          title="Failed to load products report"
          message={error}
          onRetry={() => fetchProducts()}
        />
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout onSync={handleSync} syncing={false}>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Products Report</h1>
          <p className="text-gray-600 mt-2">View product performance and revenue data</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Products</CardTitle>
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
                ${data?.revenueData.reduce((sum, r) => sum + Number(r.total_revenue), 0).toFixed(2) || '0.00'}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {data?.revenueData.reduce((sum, r) => sum + Number(r.order_count), 0) || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
            <CardDescription>Filter products by status</CardDescription>
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
              <Button
                variant="outline"
                onClick={() => {
                  setFilters({ status: '' })
                  fetchProducts(1)
                }}
              >
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Products Table */}
        {data && (
          <DataTable
            data={data.products}
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
