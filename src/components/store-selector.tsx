'use client'

import { useStore } from '@/contexts/store-context'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, Store } from 'lucide-react'

export function StoreSelector() {
  const { currentStoreId, setCurrentStoreId, stores, loading } = useStore()

  if (loading) {
    return (
      <div className="flex items-center space-x-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm text-muted-foreground">Loading stores...</span>
      </div>
    )
  }

  if (stores.length === 0) {
    return (
      <div className="flex items-center space-x-2">
        <Store className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">No stores found</span>
      </div>
    )
  }

  const currentStore = stores.find(store => store.id === currentStoreId)

  return (
    <div className="flex items-center space-x-2">
      <Store className="h-4 w-4 text-muted-foreground" />
      <Select
        value={currentStoreId || ''}
        onValueChange={(value) => setCurrentStoreId(value)}
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Select a store">
            {currentStore ? currentStore.name : 'Select a store'}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {stores.map((store) => (
            <SelectItem key={store.id} value={store.id}>
              <div className="flex flex-col">
                <span className="font-medium">{store.name}</span>
                <span className="text-xs text-muted-foreground">
                  {store.url}
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

