'use client'

import { useState, useEffect } from 'react'
import { signOut, useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

interface HeaderProps {
  onSync: () => void
  syncing: boolean
}

export function Header({ onSync, syncing }: HeaderProps) {
  const [lastSyncTime, setLastSyncTime] = useState<string>('Never')
  const { data: session } = useSession()

  useEffect(() => {
    // Get last sync time from localStorage or API
    const stored = localStorage.getItem('lastSyncTime')
    if (stored) {
      setLastSyncTime(new Date(stored).toLocaleString())
    }
  }, [])

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/auth/signin' })
  }

  const handleSync = async () => {
    await onSync()
    const now = new Date().toISOString()
    localStorage.setItem('lastSyncTime', now)
    setLastSyncTime(new Date(now).toLocaleString())
  }

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {process.env.NEXT_PUBLIC_STORE_NAME || 'My Store'} Dashboard
            </h2>
            <p className="text-sm text-gray-600">
              Last sync: {lastSyncTime}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="text-right">
            <p className="text-sm text-gray-600">Status</p>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
              <span className="text-sm font-medium text-gray-900">Connected</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className="text-right">
              <p className="text-sm text-gray-600">Welcome</p>
              <p className="text-sm font-medium text-gray-900">
                {session?.user?.name || session?.user?.email || 'User'}
              </p>
            </div>
            
            <Button 
              onClick={handleSync}
              disabled={syncing}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {syncing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Syncing...
                </>
              ) : (
                <>
                  🔄 Sync Data
                </>
              )}
            </Button>
            
            <Button 
              onClick={handleLogout}
              variant="outline"
              size="sm"
            >
              Logout
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}
