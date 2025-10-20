'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'

export interface Store {
  id: string
  name: string
  url: string
  createdAt: string
  updatedAt: string
}

interface StoreContextType {
  currentStoreId: string | null
  setCurrentStoreId: (storeId: string | null) => void
  stores: Store[]
  loading: boolean
  error: string | null
  refreshStores: () => Promise<void>
}

const StoreContext = createContext<StoreContextType | undefined>(undefined)

export function StoreProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [currentStoreId, setCurrentStoreIdState] = useState<string | null>(null)
  const [stores, setStores] = useState<Store[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Cookie management
  const COOKIE_NAME = 'current_store_id'
  
  const setCookie = (storeId: string | null) => {
    if (typeof document !== 'undefined') {
      if (storeId) {
        document.cookie = `${COOKIE_NAME}=${storeId}; path=/; max-age=${60 * 60 * 24 * 30}` // 30 days
      } else {
        document.cookie = `${COOKIE_NAME}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`
      }
    }
  }

  const getCookie = (): string | null => {
    if (typeof document === 'undefined') return null
    
    const cookies = document.cookie.split(';')
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=')
      if (name === COOKIE_NAME) {
        return value
      }
    }
    return null
  }

  const setCurrentStoreId = (storeId: string | null) => {
    setCurrentStoreIdState(storeId)
    setCookie(storeId)
    
    // Refresh the router to update URL params
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      if (storeId) {
        url.searchParams.set('storeId', storeId)
      } else {
        url.searchParams.delete('storeId')
      }
      router.replace(url.pathname + url.search)
    }
  }

  const loadStores = async () => {
    if (status !== 'authenticated') {
      setLoading(false)
      return
    }

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
        
        // Determine current store ID
        const urlStoreId = searchParams.get('storeId')
        const cookieStoreId = getCookie()
        
        let selectedStoreId: string | null = null
        
        // Priority: URL param > cookie > first store
        if (urlStoreId && data.data.some((store: Store) => store.id === urlStoreId)) {
          selectedStoreId = urlStoreId
        } else if (cookieStoreId && data.data.some((store: Store) => store.id === cookieStoreId)) {
          selectedStoreId = cookieStoreId
        } else if (data.data.length > 0) {
          selectedStoreId = data.data[0].id
        }
        
        setCurrentStoreIdState(selectedStoreId)
        setCookie(selectedStoreId)
        
        // If no stores and not on stores page, redirect to create store
        if (data.data.length === 0 && !window.location.pathname.startsWith('/stores')) {
          router.push('/stores/new')
        }
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

  const refreshStores = async () => {
    await loadStores()
  }

  // Load stores when session changes
  useEffect(() => {
    loadStores()
  }, [status])

  // Update current store when URL changes
  useEffect(() => {
    const urlStoreId = searchParams.get('storeId')
    if (urlStoreId && stores.some(store => store.id === urlStoreId)) {
      if (currentStoreId !== urlStoreId) {
        setCurrentStoreIdState(urlStoreId)
        setCookie(urlStoreId)
      }
    }
  }, [searchParams, stores, currentStoreId])

  const value: StoreContextType = {
    currentStoreId,
    setCurrentStoreId,
    stores,
    loading,
    error,
    refreshStores
  }

  return (
    <StoreContext.Provider value={value}>
      {children}
    </StoreContext.Provider>
  )
}

export function useStore() {
  const context = useContext(StoreContext)
  if (context === undefined) {
    throw new Error('useStore must be used within a StoreProvider')
  }
  return context
}

