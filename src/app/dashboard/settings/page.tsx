'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/loading-states'

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-2">Configure your WooCommerce integration</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>WooCommerce API Settings</CardTitle>
            <CardDescription>
              Configure your WooCommerce store connection
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="store-url">Store URL</Label>
              <Input
                id="store-url"
                placeholder="https://your-store.com"
                defaultValue={process.env.NEXT_PUBLIC_WOO_URL || ''}
              />
            </div>
            <div>
              <Label htmlFor="consumer-key">Consumer Key</Label>
              <Input
                id="consumer-key"
                type="password"
                placeholder="Your consumer key"
              />
            </div>
            <div>
              <Label htmlFor="consumer-secret">Consumer Secret</Label>
              <Input
                id="consumer-secret"
                type="password"
                placeholder="Your consumer secret"
              />
            </div>
            <Button className="w-full">Save Settings</Button>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Sync Settings</CardTitle>
            <CardDescription>
              Configure data synchronization preferences
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EmptyState
              title="Settings Coming Soon"
              message="Advanced sync settings will be available in the next update."
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

