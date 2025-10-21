'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, ArrowLeft, Store, TestTube } from 'lucide-react'
import Link from 'next/link'

export default function NewStorePage() {
  const { data: session } = useSession()
  const router = useRouter()
  
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    consumerKey: '',
    consumerSecret: '',
    syncMethod: 'api' as 'api' | 'db',
    dbHost: '',
    dbUser: '',
    dbPassword: '',
    dbName: '',
    dbPrefix: 'wp_'
  })
  const [loading, setLoading] = useState(false)
  const [testing, setTesting] = useState(false)
  const [detectingPrefix, setDetectingPrefix] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/stores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create store')
      }

      if (data.success) {
        // Set the current store cookie
        document.cookie = `current_store_id=${data.data.id}; path=/; max-age=${60 * 60 * 24 * 30}` // 30 days
        
        // Redirect to dashboard with the new store selected
        router.push(`/dashboard?storeId=${data.data.id}`)
      } else {
        throw new Error(data.error || 'Failed to create store')
      }
    } catch (err) {
      console.error('Error creating store:', err)
      setError(err instanceof Error ? err.message : 'Failed to create store')
    } finally {
      setLoading(false)
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

  const handleDetectPrefix = async () => {
    try {
      setDetectingPrefix(true)
      setError(null)
      
      const response = await fetch('/api/stores/detect-prefix', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dbHost: formData.dbHost,
          dbUser: formData.dbUser,
          dbPassword: formData.dbPassword,
          dbName: formData.dbName,
        }),
      })
      
      const result = await response.json()
      
      if (result.success) {
        setFormData(prev => ({
          ...prev,
          dbPrefix: result.prefix
        }))
        alert(`Prefix detected: ${result.prefix}${result.hasWooCommerce ? '\nWooCommerce tables found!' : '\nWarning: WooCommerce tables not found'}`)
      } else {
        alert(`Failed to detect prefix: ${result.error || result.message}`)
      }
    } catch (error) {
      console.error('Detect prefix error:', error)
      alert('Failed to detect prefix. Please enter it manually.')
    } finally {
      setDetectingPrefix(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Authentication Required</h1>
          <p className="text-muted-foreground mb-4">Please sign in to create a store.</p>
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
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <Link href="/dashboard" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
            <div className="flex items-center space-x-3">
              <Store className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-3xl font-bold">Add New Store</h1>
                <p className="text-muted-foreground">Connect your WooCommerce store to start syncing data</p>
              </div>
            </div>
          </div>

          {/* Form */}
          <Card>
            <CardHeader>
              <CardTitle>Store Information</CardTitle>
              <CardDescription>
                Enter your WooCommerce store details to get started
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

                  {/* Sync Method Selector */}
                  <div>
                    <Label htmlFor="syncMethod">Sync Method</Label>
                    <select
                      id="syncMethod"
                      name="syncMethod"
                      value={formData.syncMethod}
                      onChange={handleInputChange}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="api">REST API (Recommended)</option>
                      <option value="db">Direct MySQL (Advanced)</option>
                    </select>
                    <p className="text-sm text-muted-foreground mt-1">
                      {formData.syncMethod === 'api' 
                        ? 'Use WooCommerce REST API for syncing (requires API keys)'
                        : 'Connect directly to MySQL database (faster, requires DB access)'}
                    </p>
                  </div>

                  {/* API Credentials (shown for both methods) */}
                  <div>
                    <Label htmlFor="consumerKey">Consumer Key {formData.syncMethod === 'db' && '(Optional)'}</Label>
                    <Input
                      id="consumerKey"
                      name="consumerKey"
                      type="text"
                      placeholder="ck_..."
                      value={formData.consumerKey}
                      onChange={handleInputChange}
                      required={formData.syncMethod === 'api'}
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Your WooCommerce REST API consumer key
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="consumerSecret">Consumer Secret {formData.syncMethod === 'db' && '(Optional)'}</Label>
                    <Input
                      id="consumerSecret"
                      name="consumerSecret"
                      type="password"
                      placeholder="cs_..."
                      value={formData.consumerSecret}
                      onChange={handleInputChange}
                      required={formData.syncMethod === 'api'}
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Your WooCommerce REST API consumer secret
                    </p>
                  </div>

                  {/* Database Connection Fields (shown only for DB sync method) */}
                  {formData.syncMethod === 'db' && (
                    <>
                      <div className="border-t pt-4 mt-4">
                        <h3 className="text-lg font-medium mb-4">Database Connection</h3>
                        
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="dbHost">Database Host</Label>
                            <Input
                              id="dbHost"
                              name="dbHost"
                              type="text"
                              placeholder="localhost or mysql.example.com"
                              value={formData.dbHost}
                              onChange={handleInputChange}
                              required
                            />
                            <p className="text-sm text-muted-foreground mt-1">
                              MySQL server hostname or IP address
                            </p>
                          </div>

                          <div>
                            <Label htmlFor="dbName">Database Name</Label>
                            <Input
                              id="dbName"
                              name="dbName"
                              type="text"
                              placeholder="wp_database"
                              value={formData.dbName}
                              onChange={handleInputChange}
                              required
                            />
                          </div>

                          <div>
                            <Label htmlFor="dbUser">Database Username</Label>
                            <Input
                              id="dbUser"
                              name="dbUser"
                              type="text"
                              placeholder="wp_user"
                              value={formData.dbUser}
                              onChange={handleInputChange}
                              required
                            />
                          </div>

                          <div>
                            <Label htmlFor="dbPassword">Database Password</Label>
                            <Input
                              id="dbPassword"
                              name="dbPassword"
                              type="password"
                              placeholder="••••••••"
                              value={formData.dbPassword}
                              onChange={handleInputChange}
                              required
                            />
                          </div>

                          <div>
                            <Label htmlFor="dbPrefix">Table Prefix</Label>
                            <div className="flex space-x-2">
                              <Input
                                id="dbPrefix"
                                name="dbPrefix"
                                type="text"
                                placeholder="wp_"
                                value={formData.dbPrefix}
                                onChange={handleInputChange}
                                className="flex-1"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                onClick={handleDetectPrefix}
                                disabled={detectingPrefix || !formData.dbHost || !formData.dbUser || !formData.dbPassword || !formData.dbName}
                              >
                                {detectingPrefix ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  'Detect'
                                )}
                              </Button>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              WordPress table prefix (usually wp_)
                            </p>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <div className="flex justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleTestConnection}
                    disabled={testing || loading}
                  >
                    {testing ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <TestTube className="h-4 w-4 mr-2" />
                    )}
                    {testing ? 'Testing...' : 'Test Connection'}
                  </Button>

                  <div className="flex space-x-4">
                    <Link href="/dashboard">
                      <Button type="button" variant="outline">
                        Cancel
                      </Button>
                    </Link>
                    <Button type="submit" disabled={loading}>
                      {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      {loading ? 'Creating Store...' : 'Create Store'}
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
