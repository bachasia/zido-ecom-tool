'use client'

import { StoreProvider } from '@/contexts/store-context'

interface StoreWrapperProps {
  children: React.ReactNode
}

export function StoreWrapper({ children }: StoreWrapperProps) {
  return <StoreProvider>{children}</StoreProvider>
}

