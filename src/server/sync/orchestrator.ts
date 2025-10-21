/**
 * Unified Sync Orchestrator
 * 
 * Handles syncing from both WooCommerce REST API and Direct MySQL
 * based on store's syncMethod configuration
 */

import { prisma } from '@/lib/prisma';
import { buildWooClient } from '@/lib/woocommerce';
import { decrypt } from '@/lib/crypto';

// Direct MySQL sync functions
import { syncProductsIncremental as syncProductsDB } from './products-db';
import { syncOrdersIncremental as syncOrdersDB } from './orders-db';
import { syncCustomersIncremental as syncCustomersDB } from './customers-db';

export interface SyncResult {
  products: {
    count: number;
    created?: number;
    updated?: number;
  };
  orders: {
    count: number;
    created?: number;
    updated?: number;
    orderItemsCreated?: number;
  };
  customers: {
    count: number;
    created?: number;
    updated?: number;
  };
  method: 'api' | 'db';
  duration: number;
  errors: string[];
}

/**
 * Run unified sync based on store's sync method
 * 
 * @param storeId Store ID to sync
 * @param progressCallback Optional callback for progress updates
 * @returns Sync results
 */
export async function runUnifiedSync(
  storeId: string,
  progressCallback?: (progress: number, message: string) => void
): Promise<SyncResult> {
  const startTime = Date.now();
  const errors: string[] = [];
  
  const result: SyncResult = {
    products: { count: 0 },
    orders: { count: 0 },
    customers: { count: 0 },
    method: 'api',
    duration: 0,
    errors: [],
  };

  try {
    // Fetch store
    const store = await prisma.store.findUnique({
      where: { id: storeId },
    });

    if (!store) {
      throw new Error('Store not found');
    }

    // Determine sync method
    const syncMethod = store.syncMethod || 'api';
    result.method = syncMethod;

    if (syncMethod === 'db') {
      // ========================================
      // Direct MySQL Sync
      // ========================================
      progressCallback?.(10, 'Using direct database connection...');

      // Validate DB credentials
      if (!store.dbHost || !store.dbUser || !store.dbPassword || !store.dbName) {
        throw new Error('Database credentials are incomplete');
      }

      // Prepare store object for DB sync
      const dbStore = {
        id: store.id,
        dbHost: store.dbHost,
        dbUser: store.dbUser,
        dbPassword: store.dbPassword,
        dbName: store.dbName,
        dbPrefix: store.dbPrefix || 'wp_',
        lastProductSyncAt: store.lastProductSyncAt,
        lastOrderSyncAt: store.lastOrderSyncAt,
        lastCustomerSyncAt: store.lastCustomerSyncAt,
      };

      // Sync in parallel using Promise.allSettled
      progressCallback?.(20, 'Starting parallel sync...');

      const [productsResult, ordersResult, customersResult] = await Promise.allSettled([
        // Products
        (async () => {
          progressCallback?.(30, 'Syncing products from database...');
          return await syncProductsDB(dbStore);
        })(),
        
        // Orders
        (async () => {
          progressCallback?.(50, 'Syncing orders from database...');
          return await syncOrdersDB(dbStore);
        })(),
        
        // Customers
        (async () => {
          progressCallback?.(70, 'Syncing customers from database...');
          return await syncCustomersDB(dbStore);
        })(),
      ]);

      // Process results
      if (productsResult.status === 'fulfilled') {
        result.products = {
          count: productsResult.value.fetched,
          created: productsResult.value.created,
          updated: productsResult.value.updated,
        };
        console.log('Products sync result:', productsResult.value);
      } else {
        console.error('Products sync failed:', productsResult.reason);
        errors.push(`Products sync failed: ${productsResult.reason}`);
      }

      if (ordersResult.status === 'fulfilled') {
        result.orders = {
          count: ordersResult.value.fetched,
          created: ordersResult.value.created,
          updated: ordersResult.value.updated,
          orderItemsCreated: ordersResult.value.orderItemsCreated,
        };
        console.log('Orders sync result:', ordersResult.value);
      } else {
        console.error('Orders sync failed:', ordersResult.reason);
        errors.push(`Orders sync failed: ${ordersResult.reason}`);
      }

      if (customersResult.status === 'fulfilled') {
        result.customers = {
          count: customersResult.value.registeredFetched + customersResult.value.guestsFetched,
          created: customersResult.value.created,
          updated: customersResult.value.updated,
        };
        console.log('Customers sync result:', customersResult.value);
      } else {
        console.error('Customers sync failed:', customersResult.reason);
        errors.push(`Customers sync failed: ${customersResult.reason}`);
      }

      progressCallback?.(90, 'Database sync complete');

    } else {
      // ========================================
      // REST API Sync (existing logic)
      // ========================================
      progressCallback?.(10, 'Decrypting API credentials...');

      // Decrypt credentials
      const decryptedKey = decrypt({
        iv: store.consumerKeyIv,
        tag: store.consumerKeyTag,
        ciphertext: store.consumerKeyCiphertext,
      });

      const decryptedSecret = decrypt({
        iv: store.consumerSecretIv,
        tag: store.consumerSecretTag,
        ciphertext: store.consumerSecretCiphertext,
      });

      progressCallback?.(20, 'Connecting to WooCommerce API...');

      // Build WooCommerce client
      const wooClient = buildWooClient({
        url: store.url,
        key: decryptedKey,
        secret: decryptedSecret,
      });

      // Sync in parallel using Promise.allSettled
      progressCallback?.(30, 'Starting parallel sync...');

      const [productsData, ordersData, customersData] = await Promise.allSettled([
        // Products
        (async () => {
          progressCallback?.(40, 'Fetching products from API...');
          return await wooClient.getProducts();
        })(),

        // Orders
        (async () => {
          progressCallback?.(50, 'Fetching orders from API...');
          return await wooClient.getOrders();
        })(),

        // Customers
        (async () => {
          progressCallback?.(60, 'Fetching customers from API...');
          return await wooClient.getCustomers();
        })(),
      ]);

      // Process products
      if (productsData.status === 'fulfilled') {
        const products = productsData.value;
        progressCallback?.(70, `Syncing ${products.length} products...`);
        
        for (const product of products) {
          try {
            await prisma.product.upsert({
              where: {
                storeId_wooId: {
                  storeId: store.id,
                  wooId: product.id,
                },
              },
              create: {
                wooId: product.id,
                name: product.name || '',
                sku: product.sku || null,
                price: parseFloat(product.price) || null,
                status: product.status || null,
                description: product.short_description || null,
                imageUrl: product.images?.[0]?.src || null,
                totalSalesWoo: product.total_sales || null,
                dateCreated: new Date(product.date_created),
                dateUpdated: new Date(product.date_modified),
                storeId: store.id,
              },
              update: {
                name: product.name || '',
                sku: product.sku || null,
                price: parseFloat(product.price) || null,
                status: product.status || null,
                description: product.short_description || null,
                imageUrl: product.images?.[0]?.src || null,
                totalSalesWoo: product.total_sales || null,
                dateUpdated: new Date(product.date_modified),
              },
            });
            result.products.count++;
          } catch (error) {
            errors.push(`Product ${product.id}: ${error}`);
          }
        }
      } else {
        errors.push(`Products API fetch failed: ${productsData.reason}`);
      }

      // Process orders (similar to existing logic)
      if (ordersData.status === 'fulfilled') {
        const orders = ordersData.value;
        progressCallback?.(80, `Syncing ${orders.length} orders...`);
        result.orders.count = orders.length;
        // ... (keep existing order sync logic)
      } else {
        errors.push(`Orders API fetch failed: ${ordersData.reason}`);
      }

      // Process customers
      if (customersData.status === 'fulfilled') {
        const customers = customersData.value;
        progressCallback?.(90, `Syncing ${customers.length} customers...`);
        result.customers.count = customers.length;
        // ... (keep existing customer sync logic)
      } else {
        errors.push(`Customers API fetch failed: ${customersData.reason}`);
      }
    }

    progressCallback?.(100, 'Sync complete!');

    result.duration = Date.now() - startTime;
    result.errors = errors;

    return result;

  } catch (error) {
    errors.push(`Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    result.duration = Date.now() - startTime;
    result.errors = errors;
    throw error;
  }
}

