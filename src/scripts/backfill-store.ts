import { prisma } from '@/lib/prisma'

async function backfillDefaultStore() {
  try {
    console.log('🔄 Starting backfill script...')

    // Check if we have WooCommerce environment variables
    const wooUrl = process.env.WOO_URL
    const wooKey = process.env.WOO_KEY
    const wooSecret = process.env.WOO_SECRET
    const storeName = process.env.NEXT_PUBLIC_STORE_NAME || 'Default Store'

    if (!wooUrl || !wooKey || !wooSecret) {
      console.log('⚠️  WooCommerce environment variables not found. Creating a default store with placeholder values.')
    }

    // Check if a default store already exists
    let defaultStore = await prisma.store.findFirst({
      where: {
        name: storeName
      }
    })

    if (!defaultStore) {
      // Create default store (without ownerId for now - will be assigned when user signs in)
      defaultStore = await prisma.store.create({
        data: {
          name: storeName,
          url: wooUrl || 'https://example.com',
          consumerKey: wooKey || 'default_key',
          consumerSecret: wooSecret || 'default_secret',
          // ownerId: null // Will be assigned when user creates their first store
        }
      })
      console.log(`✅ Default store created: ${defaultStore.name} (${defaultStore.id})`)
    } else {
      // Update existing store with new credentials if they exist
      if (wooUrl && wooKey && wooSecret) {
        defaultStore = await prisma.store.update({
          where: { id: defaultStore.id },
          data: {
            url: wooUrl,
            consumerKey: wooKey,
            consumerSecret: wooSecret,
          }
        })
        console.log(`✅ Default store updated: ${defaultStore.name} (${defaultStore.id})`)
      } else {
        console.log(`ℹ️  Default store already exists: ${defaultStore.name} (${defaultStore.id})`)
      }
    }

    // Check if there are any existing orders, products, or customers
    // Since storeId is now required, we'll just check if there are any records
    const totalOrders = await prisma.order.count()
    const totalProducts = await prisma.product.count()
    const totalCustomers = await prisma.customer.count()

    console.log(`📊 Current database state:`)
    console.log(`   - Orders: ${totalOrders}`)
    console.log(`   - Products: ${totalProducts}`)
    console.log(`   - Customers: ${totalCustomers}`)
    console.log(`   - Stores: 1 (default store)`)

    console.log('🎉 Backfill script completed successfully!')
    return defaultStore

  } catch (error) {
    console.error('❌ Error in backfill script:', error)
    throw error
  }
}

// Run the backfill if this script is executed directly
if (require.main === module) {
  backfillDefaultStore()
    .then(() => {
      console.log('✅ Backfill completed')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ Backfill failed:', error)
      process.exit(1)
    })
}

export { backfillDefaultStore }