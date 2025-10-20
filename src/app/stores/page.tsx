'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Plus, Edit, Trash2, RefreshCw, TestTube, Store, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface Store {
  id: string
  name: string
  url: string
  createdAt: string
  updatedAt: string
}

export default function StoresPage() {
  const { data: session } = useSession()
  const router = useRouter()
  
  const [stores, setStores] = useState<Store[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [syncing, setSyncing] = useState<string | null>(null)
  const [testing, setTesting] = useState<string | null>(null)

  const loadStores = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/stores')
      if (!response.ok) {
        throw new Error(`Failed to fetch stores: ${response.status}`)
      }
      
      const data = await response.json()
      if (data.success) {
        setStores(data.data)
      } else {
        throw new Error(data.error || 'Failed to load stores')
      }
    } catch (err) {
      console.error('Error loading stores:', err)
      setError(err instanceof Error ? err.message : 'Failed to load stores')
    } finally {
      setLoading(false)
    }
  }

  const handleSync = async (storeId: string) => {
    try {
      setSyncing(storeId)
      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ storeId })
      })
      const result = await response.json()
      
      if (result.success) {
        alert(`Sync completed for ${result.storeName}! ${result.ordersCount} orders, ${result.productsCount} products, ${result.customersCount} customers synced.`)
      } else {
        alert(`Sync failed: ${result.error}`)
      }
    } catch (error) {
      console.error('Sync error:', error)
      alert('Sync failed. Please try again.')
    } finally {
      setSyncing(null)
    }
  }

  const handleTestConnection = async (storeId: string) => {
    try {
      setTesting(storeId)
      const response = await fetch(`/api/stores/test?storeId=${storeId}`)
      const result = await response.json()
      
      if (result.success) {
        alert('Connection test successful! Store credentials are valid.')
      } else {
        alert(`Connection test failed: ${result.error}`)
      }
    } catch (error) {
      console.error('Test error:', error)
      alert('Connection test failed. Please try again.')
    } finally {
      setTesting(null)
    }
  }

  const handleDelete = async (storeId: string, storeName: string) => {
    if (!confirm(`Are you sure you want to delete "${storeName}"? This action cannot be undone and will remove all associated data.`)) {
      return
    }

    try {
      const response = await fetch(`/api/stores/${storeId}`, {
        method: 'DELETE'
      })
      const result = await response.json()
      
      if (result.success) {
        alert('Store deleted successfully!')
        await loadStores()
      } else {
        alert(`Delete failed: ${result.error}`)
      }
    } catch (error) {
      console.error('Delete error:', error)
      alert('Delete failed. Please try again.')
    }
  }

  useEffect(() => {
    loadStores()
  }, [])

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Authentication Required</h1>
          <p className="text-muted-foreground mb-4">Please sign in to manage your stores.</p>
          <Link href="/auth/signin">
            <Button>Sign In</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Store className="h-8 w-8 text-primary" />
                <div>
                  <h1 className="text-3xl font-bold">Store Management</h1>
                  <p className="text-muted-foreground">Manage your WooCommerce stores</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Link href="/dashboard">
                  <Button variant="outline">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Dashboard
                  </Button>
                </Link>
                <Link href="/stores/new">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Store
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Stores Table */}
          <Card>
            <CardHeader>
              <CardTitle>Your Stores</CardTitle>
              <CardDescription>
                {stores.length === 0 
                  ? "You haven't added any stores yet. Click 'Add Store' to get started."
                  : `You have ${stores.length} store${stores.length === 1 ? '' : 's'} configured.`
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" />
                  <span>Loading stores...</span>
                </div>
              ) : stores.length === 0 ? (
                <div className="text-center py-8">
                  <Store className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No stores found</h3>
                  <p className="text-muted-foreground mb-4">Get started by adding your first WooCommerce store.</p>
                  <Link href="/stores/new">
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Your First Store
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-semibold">Name</th>
                        <th className="text-left py-3 px-4 font-semibold">URL</th>
                        <th className="text-left py-3 px-4 font-semibold">Created</th>
                        <th className="text-left py-3 px-4 font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stores.map((store) => (
                        <tr key={store.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <div className="font-medium">{store.name}</div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="text-sm text-muted-foreground">{store.url}</div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="text-sm text-muted-foreground">
                              {new Date(store.createdAt).toLocaleDateString()}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleTestConnection(store.id)}
                                disabled={testing === store.id}
                              >
                                {testing === store.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <TestTube className="h-3 w-3" />
                                )}
                                <span className="ml-1">Test</span>
                              </Button>
                              
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleSync(store.id)}
                                disabled={syncing === store.id}
                              >
                                {syncing === store.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <RefreshCw className="h-3 w-3" />
                                )}
                                <span className="ml-1">Sync</span>
                              </Button>
                              
                              <Link href={`/stores/${store.id}`}>
                                <Button size="sm" variant="outline">
                                  <Edit className="h-3 w-3" />
                                  <span className="ml-1">Edit</span>
                                </Button>
                              </Link>
                              
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDelete(store.id, store.name)}
                              >
                                <Trash2 className="h-3 w-3" />
                                <span className="ml-1">Delete</span>
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
