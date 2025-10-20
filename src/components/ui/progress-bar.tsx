'use client'

import { cn } from '@/lib/utils'

interface ProgressBarProps {
  progress: number
  message?: string
  className?: string
  showPercentage?: boolean
}

export function ProgressBar({ 
  progress, 
  message, 
  className,
  showPercentage = true 
}: ProgressBarProps) {
  return (
    <div className={cn('w-full', className)}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">
          {message || 'Progress'}
        </span>
        {showPercentage && (
          <span className="text-sm text-gray-500">
            {Math.round(progress)}%
          </span>
        )}
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
    </div>
  )
}

interface SyncProgressProps {
  status: 'idle' | 'running' | 'completed' | 'error'
  progress: number
  message: string
  startTime?: number
  endTime?: number
  error?: string
}

export function SyncProgress({ 
  status, 
  progress, 
  message, 
  startTime, 
  endTime,
  error 
}: SyncProgressProps) {
  const getStatusColor = () => {
    switch (status) {
      case 'running':
        return 'text-blue-600'
      case 'completed':
        return 'text-green-600'
      case 'error':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  const getStatusIcon = () => {
    switch (status) {
      case 'running':
        return '🔄'
      case 'completed':
        return '✅'
      case 'error':
        return '❌'
      default:
        return '⏸️'
    }
  }

  const formatDuration = (start: number, end?: number) => {
    const endTime = end || Date.now()
    const duration = endTime - start
    const seconds = Math.floor(duration / 1000)
    const minutes = Math.floor(seconds / 60)
    
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`
    }
    return `${seconds}s`
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-lg">{getStatusIcon()}</span>
        <span className={`font-medium ${getStatusColor()}`}>
          {message}
        </span>
      </div>
      
      {status === 'running' && (
        <ProgressBar 
          progress={progress} 
          message="Syncing data..."
          showPercentage={true}
        />
      )}
      
      {startTime && (
        <div className="text-xs text-gray-500">
          Duration: {formatDuration(startTime, endTime)}
        </div>
      )}
      
      {error && (
        <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
          Error: {error}
        </div>
      )}
    </div>
  )
}

