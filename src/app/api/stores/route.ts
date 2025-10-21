import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { encrypt } from '@/lib/crypto'

// GET /api/stores -> list current user's stores
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    // console.log('GET /api/stores - Session debug:', { session: session?.user })
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const stores = await prisma.store.findMany({
      where: {
        ownerId: session.user.id
      },
      select: {
        id: true,
        name: true,
        url: true,
        createdAt: true,
        updatedAt: true
        // Note: consumerKey and consumerSecret are excluded for security
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({
      success: true,
      data: stores
    })

  } catch (error) {
    console.error('Error fetching stores:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/stores -> create a store
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    // console.log('POST /api/stores - Session debug:', { session: session?.user })
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { 
      name, 
      url, 
      consumerKey, 
      consumerSecret,
      syncMethod = 'api',
      dbHost,
      dbUser,
      dbPassword,
      dbName,
      dbPrefix = 'wp_'
    } = body

    // Validation based on sync method
    if (!name || !url) {
      return NextResponse.json(
        { error: 'Missing required fields: name, url' },
        { status: 400 }
      )
    }

    // Validate sync method specific requirements
    if (syncMethod === 'api') {
      if (!consumerKey || !consumerSecret) {
        return NextResponse.json(
          { error: 'API sync method requires consumerKey and consumerSecret' },
          { status: 400 }
        )
      }
    } else if (syncMethod === 'db') {
      if (!dbHost || !dbUser || !dbPassword || !dbName) {
        return NextResponse.json(
          { error: 'Database sync method requires dbHost, dbUser, dbPassword, and dbName' },
          { status: 400 }
        )
      }
    } else {
      return NextResponse.json(
        { error: 'Invalid sync method. Must be "api" or "db"' },
        { status: 400 }
      )
    }

    // Validate URL format
    let formattedUrl: string
    try {
      // Remove trailing slash and validate URL
      formattedUrl = url.replace(/\/$/, '')
      new URL(formattedUrl)
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      )
    }

    // Encrypt credentials using AES-256-CBC
    // For API method, encrypt consumerKey and consumerSecret
    let encryptedKey, encryptedSecret
    
    if (syncMethod === 'api' || (consumerKey && consumerSecret)) {
      encryptedKey = encrypt(consumerKey?.trim() || '')
      encryptedSecret = encrypt(consumerSecret?.trim() || '')
    } else {
      // For DB-only sync, use placeholder encrypted values
      encryptedKey = encrypt('')
      encryptedSecret = encrypt('')
    }
    
    // Prepare store data
    const storeData: any = {
      name: name.trim(),
      url: formattedUrl,
      consumerKeyCiphertext: encryptedKey.ciphertext,
      consumerKeyIv: encryptedKey.iv,
      consumerKeyTag: encryptedKey.tag,
      consumerSecretCiphertext: encryptedSecret.ciphertext,
      consumerSecretIv: encryptedSecret.iv,
      consumerSecretTag: encryptedSecret.tag,
      syncMethod,
      ownerId: session.user.id
    }
    
    // Add DB connection fields if DB sync method
    if (syncMethod === 'db') {
      storeData.dbHost = dbHost
      storeData.dbUser = dbUser
      storeData.dbPassword = dbPassword  // TODO: Should also be encrypted in production
      storeData.dbName = dbName
      storeData.dbPrefix = dbPrefix || 'wp_'
    }
    
    const store = await prisma.store.create({
      data: storeData,
      select: {
        id: true,
        name: true,
        url: true,
        createdAt: true,
        updatedAt: true
        // Note: encrypted credentials are excluded for security
      }
    })

    return NextResponse.json({
      success: true,
      data: store
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating store:', error)
    
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
