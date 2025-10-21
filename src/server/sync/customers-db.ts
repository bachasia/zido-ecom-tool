/**
 * Customers Sync via Direct MySQL
 * 
 * Syncs customers from WordPress/WooCommerce database directly
 * Includes both registered users and guest customers from orders
 */

import { prisma } from '@/lib/prisma';
import { connectWooDB, closeWooDB } from '@/lib/woocommerce-db';
import { wpTable } from '@/lib/wp-sql';

export interface SyncCustomersResult {
  registeredFetched: number;
  guestsFetched: number;
  created: number;
  updated: number;
  errors: number;
}

/**
 * Sync customers incrementally from WordPress database
 * 
 * Syncs both:
 * 1. Registered WordPress users (from wp_users)
 * 2. Guest customers (from shop_order billing emails)
 * 
 * @param store Store object with database credentials and lastCustomerSyncAt
 * @returns Sync results with counts
 */
export async function syncCustomersIncremental(store: {
  id: string;
  dbHost: string;
  dbUser: string;
  dbPassword: string;
  dbName: string;
  dbPrefix?: string;
  lastCustomerSyncAt?: Date | null;
}): Promise<SyncCustomersResult> {
  const result: SyncCustomersResult = {
    registeredFetched: 0,
    guestsFetched: 0,
    created: 0,
    updated: 0,
    errors: 0,
  };

  const db = await connectWooDB(store);

  try {
    // Get table names
    const users = wpTable(store, 'users');
    const usermeta = wpTable(store, 'usermeta');
    const posts = wpTable(store, 'posts');
    const postmeta = wpTable(store, 'postmeta');

    // Get last sync time
    const lastSync = store.lastCustomerSyncAt
      ? new Date(store.lastCustomerSyncAt).toISOString().slice(0, 19).replace('T', ' ')
      : '1970-01-01 00:00:00';

    console.log(`Syncing customers modified after ${lastSync}`);

    // ========================================
    // 1. Sync Registered WordPress Users
    // ========================================
    const [userRows]: any = await db.execute(
      `SELECT ID, user_email, user_registered, user_nicename, display_name
       FROM ${users}
       WHERE user_registered > ?
       ORDER BY user_registered ASC
       LIMIT 1000`,
      [lastSync]
    );

    result.registeredFetched = userRows.length;
    console.log(`Fetched ${result.registeredFetched} registered users from database`);

    // Process each registered user
    for (const u of userRows) {
      try {
        const userId = u.ID;

        // Fetch user metadata for first/last name
        const [metaRows]: any = await db.execute(
          `SELECT meta_key, meta_value
           FROM ${usermeta}
           WHERE user_id = ?
           AND meta_key IN ('first_name', 'last_name', 'billing_first_name', 'billing_last_name')`,
          [userId]
        );

        // Build meta map
        const meta: Record<string, string> = {};
        for (const m of metaRows) {
          meta[m.meta_key] = m.meta_value;
        }

        const firstName = meta.first_name || meta.billing_first_name || null;
        const lastName = meta.last_name || meta.billing_last_name || null;

        // Check if customer exists
        const existing = await prisma.customer.findUnique({
          where: {
            storeId_wooId: {
              storeId: store.id,
              wooId: userId,
            },
          },
        });

        // Upsert customer
        await prisma.customer.upsert({
          where: {
            storeId_wooId: {
              storeId: store.id,
              wooId: userId,
            },
          },
          create: {
            wooId: userId,
            firstName,
            lastName,
            email: u.user_email || null,
            dateCreated: new Date(u.user_registered + 'Z').getTime(),
            dateUpdated: new Date(),
            storeId: store.id,
          },
          update: {
            firstName,
            lastName,
            email: u.user_email || null,
            dateUpdated: new Date(),
          },
        });

        if (existing) {
          result.updated++;
        } else {
          result.created++;
        }

      } catch (userError) {
        console.error(`Error syncing user ${u.ID}:`, userError);
        result.errors++;
      }
    }

    // ========================================
    // 2. Sync Guest Customers from Orders
    // ========================================
    // Find all unique billing emails from orders that don't have a registered user
    const [guestRows]: any = await db.execute(
      `SELECT DISTINCT 
         pm_email.meta_value as billing_email,
         pm_first.meta_value as billing_first_name,
         pm_last.meta_value as billing_last_name,
         MIN(p.post_date_gmt) as first_order_date
       FROM ${posts} p
       LEFT JOIN ${postmeta} pm_email ON p.ID = pm_email.post_id AND pm_email.meta_key = '_billing_email'
       LEFT JOIN ${postmeta} pm_first ON p.ID = pm_first.post_id AND pm_first.meta_key = '_billing_first_name'
       LEFT JOIN ${postmeta} pm_last ON p.ID = pm_last.post_id AND pm_last.meta_key = '_billing_last_name'
       WHERE p.post_type = 'shop_order'
         AND p.post_date_gmt > ?
         AND pm_email.meta_value IS NOT NULL
         AND pm_email.meta_value != ''
         AND NOT EXISTS (
           SELECT 1 FROM ${users} u WHERE u.user_email = pm_email.meta_value
         )
       GROUP BY pm_email.meta_value, pm_first.meta_value, pm_last.meta_value
       LIMIT 1000`,
      [lastSync]
    );

    result.guestsFetched = guestRows.length;
    console.log(`Fetched ${result.guestsFetched} guest customers from orders`);

    // Process each guest customer
    for (const g of guestRows) {
      try {
        const email = g.billing_email;
        
        if (!email) continue;

        // Check if customer already exists by email
        const existing = await prisma.customer.findFirst({
          where: {
            storeId: store.id,
            email,
          },
        });

        if (existing) {
          // Update existing customer
          await prisma.customer.update({
            where: { id: existing.id },
            data: {
              firstName: g.billing_first_name || existing.firstName,
              lastName: g.billing_last_name || existing.lastName,
              dateUpdated: new Date(),
            },
          });
          result.updated++;
        } else {
          // Create new guest customer with wooId = 0 (guest indicator)
          // Note: We'll assign a unique ID in the database
          await prisma.customer.create({
            data: {
              wooId: 0, // 0 indicates guest customer
              firstName: g.billing_first_name || null,
              lastName: g.billing_last_name || null,
              email,
              dateCreated: new Date(g.first_order_date + 'Z').getTime(),
              dateUpdated: new Date(),
              storeId: store.id,
            },
          });
          result.created++;
        }

      } catch (guestError) {
        console.error(`Error syncing guest customer ${g.billing_email}:`, guestError);
        result.errors++;
      }
    }

    // Update last sync timestamp
    await prisma.store.update({
      where: { id: store.id },
      data: { lastCustomerSyncAt: new Date() },
    });

    console.log(`Customers sync complete:`, result);

    return result;

  } finally {
    await closeWooDB(db);
  }
}

/**
 * Sync all customers (full sync)
 * 
 * @param store Store object with database credentials
 * @returns Sync results with counts
 */
export async function syncCustomersFull(store: {
  id: string;
  dbHost: string;
  dbUser: string;
  dbPassword: string;
  dbName: string;
  dbPrefix?: string;
}): Promise<SyncCustomersResult> {
  return syncCustomersIncremental({
    ...store,
    lastCustomerSyncAt: new Date('1970-01-01T00:00:00Z'),
  });
}

