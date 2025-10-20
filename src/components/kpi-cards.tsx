'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface KPICardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: string
  trend?: {
    value: number
    isPositive: boolean
  }
  loading?: boolean
}

export function KPICard({ title, value, subtitle, icon, trend, loading }: KPICardProps) {
  if (loading) {
    return (
      <Card className="relative overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-500">{title}</CardTitle>
          <span className="text-2xl opacity-50">{icon}</span>
        </CardHeader>
        <CardContent>
          <div className="h-8 bg-gray-200 rounded animate-pulse mb-2"></div>
          <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="hover:shadow-lg transition-shadow duration-200">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">{title}</CardTitle>
        <span className="text-2xl">{icon}</span>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-gray-900 mb-1">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </div>
        {subtitle && (
          <p className="text-xs text-gray-500 mb-2">{subtitle}</p>
        )}
        {trend && (
          <div className="flex items-center text-xs">
            <span className={`mr-1 ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {trend.isPositive ? '↗' : '↘'}
            </span>
            <span className={trend.isPositive ? 'text-green-600' : 'text-red-600'}>
              {Math.abs(trend.value)}%
            </span>
            <span className="text-gray-500 ml-1">vs last period</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface KPIGridProps {
  data: {
    totalRevenue: number
    ordersCount: number
    customersCount: number
  }
  loading?: boolean
}

export function KPIGrid({ data, loading }: KPIGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <KPICard
        title="Total Revenue"
        value={`$${data.totalRevenue.toLocaleString()}`}
        subtitle="From all orders"
        icon="💰"
        loading={loading}
      />
      <KPICard
        title="Total Orders"
        value={data.ordersCount}
        subtitle="Orders in selected period"
        icon="📦"
        loading={loading}
      />
      <KPICard
        title="Total Customers"
        value={data.customersCount}
        subtitle="Registered customers"
        icon="👥"
        loading={loading}
      />
    </div>
  )
}

