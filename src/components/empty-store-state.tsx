'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Store } from 'lucide-react'
import Link from 'next/link'

interface EmptyStoreStateProps {
  title?: string
  description?: string
  buttonText?: string
  buttonHref?: string
}

export function EmptyStoreState({ 
  title = "Chọn một Store ở trên",
  description = "Vui lòng chọn một store để xem dữ liệu",
  buttonText = "Tạo Store",
  buttonHref = "/stores/new"
}: EmptyStoreStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="text-center">
            <Store className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-4">{title}</h2>
            <p className="text-gray-600 mb-6">{description}</p>
            <Link href={buttonHref}>
              <Button>{buttonText}</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

