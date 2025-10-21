/**
 * Products Sync via Direct MySQL
 * 
 * Syncs products from WordPress/WooCommerce database directly
 */

import { prisma } from '@/lib/prisma';
import { connectWooDB, closeWooDB } from '@/lib/woocommerce-db';
import { wpTable } from '@/lib/wp-sql';

export interface SyncProductsResult {
  fetched: number;
  created: number;
  updated: number;
  errors: number;
}

/**
 * Sync products incrementally from WordPress database
 * 
 * Fetches products modified since last sync and upserts them into our database.
 * Includes product metadata like price, image URL, and sales count.
 * 
 * @param store Store object with database credentials and lastProductSyncAt
 * @returns Sync results with counts
 */
export async function syncProductsIncremental(store: {
  id: string;
  dbHost: string;
  dbUser: string;
  dbPassword: string;
  dbName: string;
  dbPrefix?: string;
  lastProductSyncAt?: Date | null;
}): Promise<SyncProductsResult> {
  const result: SyncProductsResult = {
    fetched: 0,
    created: 0,
    updated: 0,
    errors: 0,
  };

  // Connect to WordPress database
  const db = await connectWooDB(store);

  try {
    // Get table names
    const posts = wpTable(store, 'posts');
    const postmeta = wpTable(store, 'postmeta');

    // Get last sync time (or very old date for initial sync)
    const lastSync = store.lastProductSyncAt 
      ? new Date(store.lastProductSyncAt).toISOString().slice(0, 19).replace('T', ' ')
      : '1970-01-01 00:00:00';

    console.log(`Syncing products modified after ${lastSync}`);

    // Fetch products (post_type='product')
    const [rows]: any = await db.execute(
      `SELECT p.ID, p.post_title, p.post_name, p.post_status, 
              p.post_date_gmt, p.post_modified_gmt
       FROM ${posts} p
       WHERE p.post_type = 'product'
         AND p.post_status IN ('publish', 'private', 'draft')
         AND p.post_modified_gmt > ?
       ORDER BY p.post_modified_gmt ASC
       LIMIT 1000`,
      [lastSync]
    );

    result.fetched = rows.length;
    console.log(`Fetched ${result.fetched} products from database`);

    // Process each product
    for (const p of rows) {
      try {
        const productId = p.ID;

        // Fetch product metadata
        const [metaRows]: any = await db.execute(
          `SELECT meta_key, meta_value 
           FROM ${postmeta} 
           WHERE post_id = ?
           AND meta_key IN ('_price', '_regular_price', '_sale_price', '_sku', 
                           '_thumbnail_id', 'total_sales', '_product_image_gallery')`,
          [productId]
        );

        // Build metadata map
        const meta: Record<string, string> = {};
        for (const m of metaRows) {
          meta[m.meta_key] = m.meta_value;
        }

        // Get price (use _price, fallback to _regular_price)
        const priceValue = meta._price || meta._regular_price;
        const price = priceValue ? parseFloat(priceValue) : null;

        // Get SKU
        const sku = meta._sku || null;

        // Get thumbnail image URL
        let imageUrl: string | null = null;
        if (meta._thumbnail_id) {
          const [imgRows]: any = await db.execute(
            `SELECT guid FROM ${posts} WHERE ID = ? LIMIT 1`,
            [meta._thumbnail_id]
          );
          
          if (imgRows && imgRows.length > 0) {
            imageUrl = imgRows[0].guid || null;
          }
        }

        // Get total sales
        const totalSalesWoo = meta.total_sales ? parseInt(meta.total_sales, 10) : null;

        // Prepare product data
        const productData = {
          name: p.post_title || '',
          sku,
          price,
          status: p.post_status || 'draft',
          description: null, // Short description not in posts table, would need separate query
          imageUrl,
          totalSalesWoo,
          dateCreated: new Date(p.post_date_gmt + 'Z'),
          dateUpdated: new Date(p.post_modified_gmt + 'Z'),
        };

        // Check if product exists
        const existing = await prisma.product.findUnique({
          where: {
            storeId_wooId: {
              storeId: store.id,
              wooId: productId,
            },
          },
        });

        // Upsert product
        await prisma.product.upsert({
          where: {
            storeId_wooId: {
              storeId: store.id,
              wooId: productId,
            },
          },
          create: {
            ...productData,
            storeId: store.id,
            wooId: productId,
          },
          update: productData,
        });

        if (existing) {
          result.updated++;
        } else {
          result.created++;
        }

      } catch (productError) {
        console.error(`Error syncing product ${p.ID}:`, productError);
        result.errors++;
      }
    }

    // Update last sync timestamp
    await prisma.store.update({
      where: { id: store.id },
      data: { lastProductSyncAt: new Date() },
    });

    console.log(`Products sync complete:`, result);

    return result;

  } finally {
    await closeWooDB(db);
  }
}

/**
 * Sync all products (full sync)
 * 
 * Similar to incremental sync but fetches all products regardless of modification date.
 * Use this for initial sync or to rebuild product catalog.
 * 
 * @param store Store object with database credentials
 * @returns Sync results with counts
 */
export async function syncProductsFull(store: {
  id: string;
  dbHost: string;
  dbUser: string;
  dbPassword: string;
  dbName: string;
  dbPrefix?: string;
}): Promise<SyncProductsResult> {
  // Use incremental sync with very old date
  return syncProductsIncremental({
    ...store,
    lastProductSyncAt: new Date('1970-01-01T00:00:00Z'),
  });
}

