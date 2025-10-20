'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, ArrowLeft, Store, TestTube } from 'lucide-react'
import Link from 'next/link'

interface Store {
  id: string
  name: string
  url: string
  consumerKey: string
  consumerSecret: string
  createdAt: string
  updatedAt: string
}

interface EditStorePageProps {
  params: Promise<{
    id: string
  }>
}

export default function EditStorePage({ params }: EditStorePageProps) {
  const { data: session } = useSession()
  const router = useRouter()
  
  const [store, setStore] = useState<Store | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    consumerKey: '',
    consumerSecret: ''
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadStore = async (id: string) => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/stores/${id}`)
      if (!response.ok) {
        throw new Error(`Failed to fetch store: ${response.status}`)
      }
      
      const data = await response.json()
      if (data.success) {
        setStore(data.data)
        setFormData({
          name: data.data.name,
          url: data.data.url,
          consumerKey: data.data.consumerKey,
          consumerSecret: data.data.consumerSecret
        })
      } else {
        throw new Error(data.error || 'Failed to load store')
      }
    } catch (err) {
      console.error('Error loading store:', err)
      setError(err instanceof Error ? err.message : 'Failed to load store')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const { id } = await params
      const response = await fetch(`/api/stores/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update store')
      }

      if (data.success) {
        alert('Store updated successfully!')
        router.push('/stores')
      } else {
        throw new Error(data.error || 'Failed to update store')
      }
    } catch (err) {
      console.error('Error updating store:', err)
      setError(err instanceof Error ? err.message : 'Failed to update store')
    } finally {
      setSaving(false)
    }
  }

  const handleTestConnection = async () => {
    try {
      setTesting(true)
      const response = await fetch('/api/stores/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })
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
      setTesting(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  useEffect(() => {
    const loadStoreAsync = async () => {
      const { id } = await params
      await loadStore(id)
    }
    loadStoreAsync()
  }, [])

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Authentication Required</h1>
          <p className="text-muted-foreground mb-4">Please sign in to edit stores.</p>
          <Link href="/auth/signin">
            <Button>Sign In</Button>
          </Link>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading store...</p>
        </div>
      </div>
    )
  }

  if (!store) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Store Not Found</h1>
          <p className="text-muted-foreground mb-4">The store you're looking for doesn't exist or you don't have access to it.</p>
          <Link href="/stores">
            <Button>Back to Stores</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <Link href="/stores" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Stores
            </Link>
            <div className="flex items-center space-x-3">
              <Store className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-3xl font-bold">Edit Store</h1>
                <p className="text-muted-foreground">Update your WooCommerce store settings</p>
              </div>
            </div>
          </div>

          {/* Form */}
          <Card>
            <CardHeader>
              <CardTitle>Store Information</CardTitle>
              <CardDescription>
                Update your store details and API credentials
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Store Name</Label>
                    <Input
                      id="name"
                      name="name"
                      type="text"
                      placeholder="My WooCommerce Store"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="url">Store URL</Label>
                    <Input
                      id="url"
                      name="url"
                      type="url"
                      placeholder="https://mystore.com"
                      value={formData.url}
                      onChange={handleInputChange}
                      required
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Enter your store's base URL (without trailing slash)
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="consumerKey">Consumer Key</Label>
                    <Input
                      id="consumerKey"
                      name="consumerKey"
                      type="text"
                      placeholder="ck_..."
                      value={formData.consumerKey}
                      onChange={handleInputChange}
                      required
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Your WooCommerce REST API consumer key
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="consumerSecret">Consumer Secret</Label>
                    <Input
                      id="consumerSecret"
                      name="consumerSecret"
                      type="password"
                      placeholder="cs_..."
                      value={formData.consumerSecret}
                      onChange={handleInputChange}
                      required
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Your WooCommerce REST API consumer secret
                    </p>
                  </div>
                </div>

                <div className="flex justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleTestConnection}
                    disabled={testing || saving}
                  >
                    {testing ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <TestTube className="h-4 w-4 mr-2" />
                    )}
                    {testing ? 'Testing...' : 'Test Connection'}
                  </Button>

                  <div className="flex space-x-4">
                    <Link href="/stores">
                      <Button type="button" variant="outline">
                        Cancel
                      </Button>
                    </Link>
                    <Button type="submit" disabled={saving}>
                      {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      {saving ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Help section */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Need Help?</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 text-sm text-muted-foreground">
                <div>
                  <h4 className="font-medium text-foreground mb-2">How to get your API credentials:</h4>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Go to your WooCommerce admin dashboard</li>
                    <li>Navigate to WooCommerce → Settings → Advanced → REST API</li>
                    <li>Click "Add Key" to create a new API key</li>
                    <li>Set permissions to "Read/Write"</li>
                    <li>Copy the Consumer Key and Consumer Secret</li>
                  </ol>
                </div>
                <div>
                  <h4 className="font-medium text-foreground mb-2">Store URL format:</h4>
                  <p>Use your store's base URL without trailing slash, e.g., <code className="bg-muted px-1 rounded">https://mystore.com</code></p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
