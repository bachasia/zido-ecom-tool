'use client'

import { useSession, signOut } from 'next-auth/react'
import { useStore } from '@/contexts/store-context'
import { StoreSelector } from '@/components/store-selector'
import { Button } from '@/components/ui/button'
import { Plus, LogOut, User, Store } from 'lucide-react'
import Link from 'next/link'

interface AppHeaderProps {}

export function AppHeader({}: AppHeaderProps) {
  const { data: session } = useSession()
  const { stores } = useStore()

  const handleSignOut = () => {
    signOut({ callbackUrl: '/' })
  }

  return (
    <header className="border-b bg-background">
      <div className="flex h-16 items-center justify-between px-6">
        {/* Left side - Store selector */}
        <div className="flex items-center space-x-4">
          <StoreSelector />
        </div>

        {/* Right side - Store management and user menu */}
        <div className="flex items-center space-x-4">
          {/* Store management buttons */}
          <div className="flex items-center space-x-2">
            <Link href="/stores">
              <Button size="sm" variant="outline">
                <Store className="h-4 w-4 mr-2" />
                Stores
              </Button>
            </Link>
            
            {stores.length === 0 ? (
              <Link href="/stores/new">
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Store
                </Button>
              </Link>
            ) : (
              <Link href="/stores/new">
                <Button size="sm" variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Store
                </Button>
              </Link>
            )}
          </div>

          {/* User menu */}
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">
                {session?.user?.name || session?.user?.email}
              </span>
            </div>
            <Button
              onClick={handleSignOut}
              size="sm"
              variant="ghost"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}
