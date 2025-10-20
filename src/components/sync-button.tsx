'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { SyncProgress } from '@/components/ui/progress-bar'
import { RefreshCw, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SyncButtonProps {
  storeId: string
  onSyncComplete?: () => void
  className?: string
}

interface SyncStatus {
  status: 'idle' | 'running' | 'completed' | 'error'
  progress: number
  message: string
  startTime?: number
  endTime?: number
  error?: string
}

export function SyncButton({ storeId, onSyncComplete, className }: SyncButtonProps) {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    status: 'idle',
    progress: 0,
    message: 'Ready to sync'
  })
  const [isPolling, setIsPolling] = useState(false)

  // Poll for sync progress
  useEffect(() => {
    if (!isPolling) return

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/sync/background?storeId=${storeId}`)
        const data = await response.json()
        
        if (data.success) {
          const newStatus = data.data
          setSyncStatus(newStatus)
          
          // Stop polling if sync is completed or errored
          if (newStatus.status === 'completed' || newStatus.status === 'error') {
            setIsPolling(false)
            if (onSyncComplete) {
              onSyncComplete()
            }
          }
        }
      } catch (error) {
        console.error('Error polling sync status:', error)
        setIsPolling(false)
      }
    }, 1000) // Poll every second

    return () => clearInterval(pollInterval)
  }, [isPolling, storeId, onSyncComplete])

  const startSync = async () => {
    try {
      setSyncStatus({
        status: 'running',
        progress: 0,
        message: 'Starting sync...'
      })
      setIsPolling(true)

      const response = await fetch('/api/sync/background', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ storeId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start sync')
      }

      // Start polling for progress
      setIsPolling(true)
    } catch (error) {
      console.error('Error starting sync:', error)
      setSyncStatus({
        status: 'error',
        progress: 0,
        message: 'Failed to start sync',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      setIsPolling(false)
    }
  }

  const getButtonIcon = () => {
    switch (syncStatus.status) {
      case 'running':
        return <Loader2 className="h-4 w-4 animate-spin" />
      case 'completed':
        return <CheckCircle className="h-4 w-4" />
      case 'error':
        return <XCircle className="h-4 w-4" />
      default:
        return <RefreshCw className="h-4 w-4" />
    }
  }

  const getButtonText = () => {
    switch (syncStatus.status) {
      case 'running':
        return 'Syncing...'
      case 'completed':
        return 'Sync Complete'
      case 'error':
        return 'Sync Failed'
      default:
        return 'Sync Data'
    }
  }

  const isDisabled = syncStatus.status === 'running'

  return (
    <div className={cn('space-y-4', className)}>
      <Button
        onClick={startSync}
        disabled={isDisabled}
        className={cn(
          'w-full',
          syncStatus.status === 'completed' && 'bg-green-600 hover:bg-green-700',
          syncStatus.status === 'error' && 'bg-red-600 hover:bg-red-700'
        )}
      >
        {getButtonIcon()}
        <span className="ml-2">{getButtonText()}</span>
      </Button>

      {(syncStatus.status === 'running' || syncStatus.status === 'completed' || syncStatus.status === 'error') && (
        <div className="p-4 bg-gray-50 rounded-lg">
          <SyncProgress
            status={syncStatus.status}
            progress={syncStatus.progress}
            message={syncStatus.message}
            startTime={syncStatus.startTime}
            endTime={syncStatus.endTime}
            error={syncStatus.error}
          />
        </div>
      )}
    </div>
  )
}

