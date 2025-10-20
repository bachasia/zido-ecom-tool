'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { format } from 'date-fns'

interface Column {
  key: string
  label: string
  sortable?: boolean
  render?: (value: any, row: any) => React.ReactNode
}

interface TableProps {
  data: any[]
  columns: Column[]
  pagination: {
    page: number
    limit: number
    totalCount: number
    totalPages: number
  }
  onPageChange: (page: number) => void
  onSort: (column: string, order: 'asc' | 'desc') => void
  loading?: boolean
}

export function DataTable({ data, columns, pagination, onPageChange, onSort, loading }: TableProps) {
  const [sortColumn, setSortColumn] = useState<string>('')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  const handleSort = (column: string) => {
    const newOrder = sortColumn === column && sortOrder === 'asc' ? 'desc' : 'asc'
    setSortColumn(column)
    setSortOrder(newOrder)
    onSort(column, newOrder)
  }

  const renderCell = (column: Column, row: any) => {
    const value = row[column.key]
    
    if (column.render) {
      return column.render(value, row)
    }
    
    // Default rendering
    if (column.key.includes('date') || column.key.includes('Date')) {
      return value ? format(new Date(value), 'MMM dd, yyyy') : 'N/A'
    }
    
    if (column.key.includes('total') || column.key.includes('price')) {
      return value ? `$${parseFloat(value).toFixed(2)}` : 'N/A'
    }
    
    return value || 'N/A'
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded animate-pulse"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                {columns.map((column) => (
                  <th
                    key={column.key}
                    className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                      column.sortable ? 'cursor-pointer hover:bg-gray-100' : ''
                    }`}
                    onClick={() => column.sortable && handleSort(column.key)}
                  >
                    <div className="flex items-center space-x-1">
                      <span>{column.label}</span>
                      {column.sortable && sortColumn === column.key && (
                        <span className="text-blue-600">
                          {sortOrder === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.map((row, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  {columns.map((column) => (
                    <td key={column.key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {renderCell(column, row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="bg-white px-6 py-3 border-t border-gray-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-700">
              Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
              {Math.min(pagination.page * pagination.limit, pagination.totalCount)} of{' '}
              {pagination.totalCount} results
            </span>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
            >
              Previous
            </Button>
            
            <span className="text-sm text-gray-700">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

interface FilterProps {
  onFilterChange: (filters: any) => void
  filters: any
}

export function DateRangeFilter({ onFilterChange, filters }: FilterProps) {
  return (
    <div className="flex gap-4 items-end">
      <div>
        <Label htmlFor="startDate" className="text-sm">Start Date</Label>
        <Input
          id="startDate"
          type="date"
          value={filters.startDate || ''}
          onChange={(e) => onFilterChange({ ...filters, startDate: e.target.value })}
          className="w-40"
        />
      </div>
      <div>
        <Label htmlFor="endDate" className="text-sm">End Date</Label>
        <Input
          id="endDate"
          type="date"
          value={filters.endDate || ''}
          onChange={(e) => onFilterChange({ ...filters, endDate: e.target.value })}
          className="w-40"
        />
      </div>
    </div>
  )
}

export function StatusFilter({ onFilterChange, filters, statuses }: FilterProps & { statuses: any[] }) {
  return (
    <div>
      <Label htmlFor="status" className="text-sm">Status</Label>
      <select
        id="status"
        value={filters.status || ''}
        onChange={(e) => onFilterChange({ ...filters, status: e.target.value })}
        className="w-40 px-3 py-2 border border-gray-300 rounded-md text-sm"
      >
        <option value="">All Statuses</option>
        {statuses.map((status) => (
          <option key={status.status} value={status.status}>
            {status.status} ({status.count})
          </option>
        ))}
      </select>
    </div>
  )
}

