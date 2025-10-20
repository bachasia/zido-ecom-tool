import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

interface PageParams {
  id: string
}

export default async function CustomerPage({ params }: { params: Promise<PageParams> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Authentication required</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Please sign in to view this customer.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const { id } = await params

  // Load customer and ensure the current user owns the related store
  const customer = await prisma.customer.findFirst({
    where: {
      id,
      store: {
        ownerId: session.user.id
      }
    },
    include: {
      store: true
    }
  })

  if (!customer) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Customer not found</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <p className="text-muted-foreground">We couldn't find this customer or you don't have access.</p>
              <Button asChild variant="outline">
                <Link href="/dashboard/reports/customers">Back to Customers</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const fullName = [customer.firstName, customer.lastName].filter(Boolean).join(' ') || '—'

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Customer</h1>
        <Button asChild variant="outline">
          <Link href="/dashboard/reports/customers">Back to Customers</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{fullName}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="grid grid-cols-2 gap-x-6 gap-y-2">
            <div className="text-muted-foreground">Email</div>
            <div>{customer.email || '—'}</div>

            <div className="text-muted-foreground">First name</div>
            <div>{customer.firstName || '—'}</div>

            <div className="text-muted-foreground">Last name</div>
            <div>{customer.lastName || '—'}</div>

            <div className="text-muted-foreground">Store</div>
            <div className="truncate">{customer.store?.name || '—'}</div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}


