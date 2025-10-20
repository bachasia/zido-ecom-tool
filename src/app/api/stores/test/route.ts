import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { buildWooClient } from '@/lib/woocommerce'
import { prisma } from '@/lib/prisma'
import { decrypt } from '@/lib/crypto'

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { name, url, consumerKey, consumerSecret } = body

    // Validate required fields
    if (!name || !url || !consumerKey || !consumerSecret) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      )
    }

    // Validate URL format
    try {
      const urlObj = new URL(url)
      if (urlObj.protocol !== 'https:') {
        return NextResponse.json(
          { error: 'URL must use HTTPS protocol' },
          { status: 400 }
        )
      }
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      )
    }

    // Test connection by fetching a single product
    const wooClient = buildWooClient({
      url: url.replace(/\/$/, ''), // Remove trailing slash
      key: consumerKey,
      secret: consumerSecret,
    })

    try {
      // Try to fetch one product to test the connection
      const products = await wooClient.getProducts()
      
      return NextResponse.json({
        success: true,
        message: 'Connection test successful',
        data: {
          productsFound: products.length,
          storeUrl: url
        }
      })
    } catch (error) {
      console.error('WooCommerce connection test failed:', error)
      return NextResponse.json(
        { 
          success: false,
          error: 'Failed to connect to WooCommerce store. Please check your credentials and URL.' 
        },
        { status: 400 }
      )
    }

  } catch (error) {
    console.error('Test connection API error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const storeId = searchParams.get('storeId')

    if (!storeId) {
      return NextResponse.json(
        { error: 'storeId required' },
        { status: 400 }
      )
    }

    // Look up store by id and verify ownership
    const store = await prisma.store.findFirst({
      where: {
        id: storeId,
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
        consumerSecretTag: true
      }
    })

    if (!store) {
      return NextResponse.json(
        { error: 'Store not found or access denied' },
        { status: 404 }
      )
    }

    // Decrypt credentials
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

    // Test connection using decrypted credentials
    const wooClient = buildWooClient({
      url: store.url,
      key: decryptedKey,
      secret: decryptedSecret,
    })

    try {
      // Try to fetch one product to test the connection
      const products = await wooClient.getProducts()
      
      return NextResponse.json({
        success: true,
        message: 'Connection test successful',
        data: {
          storeName: store.name,
          storeUrl: store.url,
          productsFound: products.length
        }
      })
    } catch (error) {
      console.error('WooCommerce connection test failed:', error)
      return NextResponse.json(
        { 
          success: false,
          error: 'Failed to connect to WooCommerce store. Please check your store credentials.' 
        },
        { status: 400 }
      )
    }

  } catch (error) {
    console.error('Test connection API error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    )
  }
}
