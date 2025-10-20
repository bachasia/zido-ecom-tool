import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { encrypt, decrypt } from '@/lib/crypto'

// GET /api/stores/[id] -> get one store
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = await params
    const store = await prisma.store.findFirst({
      where: {
        id: id,
        ownerId: session.user.id
      },
      select: {
        id: true,
        name: true,
        url: true,
        consumerKeyCiphertext: true,
        consumerKeyIv: true,
        consumerKeyTag: true,
        consumerSecretCiphertext: true,
        consumerSecretIv: true,
        consumerSecretTag: true,
        createdAt: true,
        updatedAt: true
      }
    })

    if (!store) {
      return NextResponse.json(
        { error: 'Store not found' },
        { status: 404 }
      )
    }

    // Decrypt credentials for the owner
    const decryptedKey = decrypt({
      iv: store.consumerKeyIv,
      tag: store.consumerKeyTag,
      ciphertext: store.consumerKeyCiphertext
    })
    
    const decryptedSecret = decrypt({
      iv: store.consumerSecretIv,
      tag: store.consumerSecretTag,
      ciphertext: store.consumerSecretCiphertext
    })

    return NextResponse.json({
      success: true,
      data: {
        id: store.id,
        name: store.name,
        url: store.url,
        consumerKey: decryptedKey,
        consumerSecret: decryptedSecret,
        createdAt: store.createdAt,
        updatedAt: store.updatedAt
      }
    })

  } catch (error) {
    console.error('Error fetching store:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/stores/[id] -> update store
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const { name, url, consumerKey, consumerSecret } = body

    // Check if store exists and user owns it
    const existingStore = await prisma.store.findFirst({
      where: {
        id: id,
        ownerId: session.user.id
      }
    })

    if (!existingStore) {
      return NextResponse.json(
        { error: 'Store not found' },
        { status: 404 }
      )
    }

    // Prepare update data
    const updateData: any = {}
    
    if (name !== undefined) {
      updateData.name = name.trim()
    }
    
    if (url !== undefined) {
      // Validate URL format
      let formattedUrl: string
      try {
        formattedUrl = url.replace(/\/$/, '')
        new URL(formattedUrl)
        updateData.url = formattedUrl
      } catch (error) {
        return NextResponse.json(
          { error: 'Invalid URL format' },
          { status: 400 }
        )
      }
    }
    
    if (consumerKey !== undefined) {
      const encryptedKey = encrypt(consumerKey.trim())
      updateData.consumerKeyCiphertext = encryptedKey.ciphertext
      updateData.consumerKeyIv = encryptedKey.iv
      updateData.consumerKeyTag = encryptedKey.tag
    }
    
    if (consumerSecret !== undefined) {
      const encryptedSecret = encrypt(consumerSecret.trim())
      updateData.consumerSecretCiphertext = encryptedSecret.ciphertext
      updateData.consumerSecretIv = encryptedSecret.iv
      updateData.consumerSecretTag = encryptedSecret.tag
    }

    const store = await prisma.store.update({
      where: {
        id: id
      },
      data: updateData,
      select: {
        id: true,
        name: true,
        url: true,
        consumerKeyCiphertext: true,
        consumerKeyIv: true,
        consumerKeyTag: true,
        consumerSecretCiphertext: true,
        consumerSecretIv: true,
        consumerSecretTag: true,
        createdAt: true,
        updatedAt: true
      }
    })

    // Decrypt credentials for response
    const decryptedKey = decrypt({
      iv: store.consumerKeyIv,
      tag: store.consumerKeyTag,
      ciphertext: store.consumerKeyCiphertext
    })
    
    const decryptedSecret = decrypt({
      iv: store.consumerSecretIv,
      tag: store.consumerSecretTag,
      ciphertext: store.consumerSecretCiphertext
    })

    return NextResponse.json({
      success: true,
      data: {
        id: store.id,
        name: store.name,
        url: store.url,
        consumerKey: decryptedKey,
        consumerSecret: decryptedSecret,
        createdAt: store.createdAt,
        updatedAt: store.updatedAt
      }
    })

  } catch (error) {
    console.error('Error updating store:', error)
    
    // Handle unique constraint violations
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        { error: 'A store with this URL already exists' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/stores/[id] -> delete store
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = await params
    // Check if store exists and user owns it
    const existingStore = await prisma.store.findFirst({
      where: {
        id: id,
        ownerId: session.user.id
      }
    })

    if (!existingStore) {
      return NextResponse.json(
        { error: 'Store not found' },
        { status: 404 }
      )
    }

    // Delete the store (this will cascade delete related orders, products, customers)
    await prisma.store.delete({
      where: {
        id: id
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Store deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting store:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
