'use client'

import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DashboardLayout } from '@/components/dashboard-layout'
import { StoreWrapper } from '@/components/store-wrapper'

export default function ReportsPage() {
  return (
    <StoreWrapper>
      <ReportsPageContent />
    </StoreWrapper>
  )
}

function ReportsPageContent() {
  const handleSync = async () => {
    // Sync functionality would be implemented here
    console.log('Sync reports data')
  }

  const reportCards = [
    {
      title: 'Orders Report',
      description: 'View detailed order information with filters and analytics',
      href: '/dashboard/reports/orders',
      icon: '📦',
      stats: 'Order status, totals, and date ranges'
    },
    {
      title: 'Products Report',
      description: 'Analyze product performance, revenue, and sales data',
      href: '/dashboard/reports/products',
      icon: '🛍️',
      stats: 'Revenue, order count, and product status'
    },
    {
      title: 'Customers Report',
      description: 'Customer analytics including spending and order history',
      href: '/dashboard/reports/customers',
      icon: '👥',
      stats: 'Total spent, order count, and customer details'
    }
  ]

  return (
    <DashboardLayout onSync={handleSync} syncing={false}>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
          <p className="text-gray-600 mt-2">Detailed analytics and reporting</p>
        </div>

        {/* Report Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {reportCards.map((report) => (
            <Link key={report.href} href={report.href}>
              <Card className="hover:shadow-lg transition-shadow duration-200 cursor-pointer">
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    <span className="text-3xl">{report.icon}</span>
                    <div>
                      <CardTitle className="text-lg">{report.title}</CardTitle>
                      <CardDescription>{report.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">{report.stats}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* Quick Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Report Features</CardTitle>
            <CardDescription>What you can do with each report</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Orders Report</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Filter by status and date range</li>
                  <li>• Sort by any column</li>
                  <li>• Paginated results</li>
                  <li>• Export capabilities</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Products Report</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Revenue aggregation</li>
                  <li>• Order count per product</li>
                  <li>• Status filtering</li>
                  <li>• Performance metrics</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Customers Report</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Total spending per customer</li>
                  <li>• Order count analytics</li>
                  <li>• Customer segmentation</li>
                  <li>• Lifetime value tracking</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
