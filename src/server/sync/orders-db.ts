/**
 * Orders Sync via Direct MySQL
 * 
 * Syncs orders and order items from WordPress/WooCommerce database directly
 */

import { prisma } from '@/lib/prisma';
import { connectWooDB, closeWooDB } from '@/lib/woocommerce-db';
import { wpTable } from '@/lib/wp-sql';

export interface SyncOrdersResult {
  fetched: number;
  created: number;
  updated: number;
  orderItemsCreated: number;
  errors: number;
}

/**
 * Sync orders incrementally from WordPress database
 * 
 * Fetches orders (shop_order post type) and their line items from WooCommerce tables.
 * Includes billing, shipping, payment, and order item details.
 * 
 * @param store Store object with database credentials and lastOrderSyncAt
 * @returns Sync results with counts
 */
export async function syncOrdersIncremental(store: {
  id: string;
  dbHost: string;
  dbUser: string;
  dbPassword: string;
  dbName: string;
  dbPrefix?: string;
  lastOrderSyncAt?: Date | null;
}): Promise<SyncOrdersResult> {
  const result: SyncOrdersResult = {
    fetched: 0,
    created: 0,
    updated: 0,
    orderItemsCreated: 0,
    errors: 0,
  };

  const db = await connectWooDB(store);

  try {
    // Get table names
    const posts = wpTable(store, 'posts');
    const postmeta = wpTable(store, 'postmeta');
    const orderItems = wpTable(store, 'woocommerce_order_items');
    const orderItemMeta = wpTable(store, 'woocommerce_order_itemmeta');

    // Get last sync time
    const lastSync = store.lastOrderSyncAt
      ? new Date(store.lastOrderSyncAt).toISOString().slice(0, 19).replace('T', ' ')
      : '1970-01-01 00:00:00';

    console.log(`Syncing orders modified after ${lastSync}`);

    // Fetch orders (post_type='shop_order')
    const [rows]: any = await db.execute(
      `SELECT p.ID, p.post_date_gmt, p.post_modified_gmt, p.post_status
       FROM ${posts} p
       WHERE p.post_type = 'shop_order'
         AND p.post_modified_gmt > ?
       ORDER BY p.post_modified_gmt ASC
       LIMIT 1000`,
      [lastSync]
    );

    result.fetched = rows.length;
    console.log(`Fetched ${result.fetched} orders from database`);

    // Process each order
    for (const p of rows) {
      try {
        const orderId = p.ID;

        // Fetch order metadata
        const [metaRows]: any = await db.execute(
          `SELECT meta_key, meta_value 
           FROM ${postmeta} 
           WHERE post_id = ?
           AND meta_key IN (
             '_order_total', '_order_currency', '_payment_method', '_payment_method_title',
             '_billing_first_name', '_billing_last_name', '_billing_email', '_billing_phone',
             '_billing_company', '_billing_address_1', '_billing_address_2', 
             '_billing_city', '_billing_state', '_billing_postcode', '_billing_country',
             '_shipping_first_name', '_shipping_last_name', '_shipping_company',
             '_shipping_address_1', '_shipping_address_2', '_shipping_city',
             '_shipping_state', '_shipping_postcode', '_shipping_country',
             '_order_shipping', '_order_tax', '_cart_discount', 
             '_customer_user', '_transaction_id',
             '_wc_order_attribution_utm_source', '_wc_order_attribution_utm_medium',
             '_wc_order_attribution_utm_campaign', '_wc_order_attribution_source_type',
             '_wc_order_attribution_referrer', '_wc_order_attribution_landing_page',
             '_wc_order_attribution_device_type', '_wc_order_attribution_session_pages'
           )`,
          [orderId]
        );

        // Build metadata map
        const meta: Record<string, string> = {};
        for (const m of metaRows) {
          meta[m.meta_key] = m.meta_value;
        }

        // Parse order data
        const total = meta._order_total ? parseFloat(meta._order_total) : 0;
        const currency = meta._order_currency || 'USD';
        const shippingTotal = meta._order_shipping ? parseFloat(meta._order_shipping) : null;
        const taxTotal = meta._order_tax ? parseFloat(meta._order_tax) : null;
        const discountTotal = meta._cart_discount ? parseFloat(meta._cart_discount) : null;

        // Prepare order data
        const orderData = {
          wooId: orderId,
          name: `#${orderId}`,
          total,
          status: p.post_status || 'pending',
          dateCreated: new Date(p.post_date_gmt + 'Z').getTime(),
          dateUpdated: new Date(p.post_modified_gmt + 'Z'),
          
          // Billing
          billingFirstName: meta._billing_first_name || null,
          billingLastName: meta._billing_last_name || null,
          billingEmail: meta._billing_email || null,
          billingPhone: meta._billing_phone || null,
          billingCompany: meta._billing_company || null,
          billingAddress1: meta._billing_address_1 || null,
          billingAddress2: meta._billing_address_2 || null,
          billingCity: meta._billing_city || null,
          billingState: meta._billing_state || null,
          billingPostcode: meta._billing_postcode || null,
          billingCountry: meta._billing_country || null,
          
          // Shipping
          shippingFirstName: meta._shipping_first_name || null,
          shippingLastName: meta._shipping_last_name || null,
          shippingCompany: meta._shipping_company || null,
          shippingAddress1: meta._shipping_address_1 || null,
          shippingAddress2: meta._shipping_address_2 || null,
          shippingCity: meta._shipping_city || null,
          shippingState: meta._shipping_state || null,
          shippingPostcode: meta._shipping_postcode || null,
          shippingCountry: meta._shipping_country || null,
          
          // Payment
          paymentMethod: meta._payment_method || null,
          paymentMethodTitle: meta._payment_method_title || null,
          transactionId: meta._transaction_id || null,
          
          // Order totals
          currency,
          discountTotal,
          shippingTotal,
          taxTotal,
          subtotal: total - (shippingTotal || 0) - (taxTotal || 0) + (discountTotal || 0),
          
          // Marketing attribution
          utmSource: meta._wc_order_attribution_utm_source || null,
          utmMedium: meta._wc_order_attribution_utm_medium || null,
          utmCampaign: meta._wc_order_attribution_utm_campaign || null,
          sourceType: meta._wc_order_attribution_source_type || null,
          referrer: meta._wc_order_attribution_referrer || null,
          landingPage: meta._wc_order_attribution_landing_page || null,
          deviceType: meta._wc_order_attribution_device_type || null,
          sessionPageViews: meta._wc_order_attribution_session_pages 
            ? parseInt(meta._wc_order_attribution_session_pages, 10) 
            : null,
        };

        // Try to link to customer by email
        let customerId: string | null = null;
        if (orderData.billingEmail) {
          const customer = await prisma.customer.findFirst({
            where: {
              storeId: store.id,
              email: orderData.billingEmail,
            },
          });
          
          if (customer) {
            customerId = customer.id;
          }
        }

        // Check if order exists
        const existing = await prisma.order.findUnique({
          where: {
            storeId_wooId: {
              storeId: store.id,
              wooId: orderId,
            },
          },
        });

        // Upsert order
        const order = await prisma.order.upsert({
          where: {
            storeId_wooId: {
              storeId: store.id,
              wooId: orderId,
            },
          },
          create: {
            ...orderData,
            storeId: store.id,
            customerId,
          },
          update: {
            ...orderData,
            customerId,
          },
        });

        if (existing) {
          result.updated++;
        } else {
          result.created++;
        }

        // Fetch order line items
        const [lineItems]: any = await db.execute(
          `SELECT order_item_id, order_item_name, order_item_type
           FROM ${orderItems}
           WHERE order_id = ?
           AND order_item_type = 'line_item'`,
          [orderId]
        );

        // Delete existing order items for idempotency
        await prisma.orderItem.deleteMany({
          where: { orderId: order.id },
        });

        // Process each line item
        for (const item of lineItems) {
          try {
            const itemId = item.order_item_id;

            // Fetch item metadata
            const [itemMetaRows]: any = await db.execute(
              `SELECT meta_key, meta_value
               FROM ${orderItemMeta}
               WHERE order_item_id = ?
               AND meta_key IN ('_product_id', '_variation_id', '_qty', '_line_total', '_line_subtotal')`,
              [itemId]
            );

            // Build item meta map
            const itemMeta: Record<string, string> = {};
            for (const im of itemMetaRows) {
              itemMeta[im.meta_key] = im.meta_value;
            }

            const productWooId = itemMeta._product_id ? parseInt(itemMeta._product_id, 10) : null;
            const quantity = itemMeta._qty ? parseInt(itemMeta._qty, 10) : 1;
            const lineTotal = itemMeta._line_total ? parseFloat(itemMeta._line_total) : 0;
            const unitPrice = quantity > 0 ? lineTotal / quantity : 0;

            // Find product in our database
            let productId: string | null = null;
            if (productWooId) {
              const product = await prisma.product.findUnique({
                where: {
                  storeId_wooId: {
                    storeId: store.id,
                    wooId: productWooId,
                  },
                },
              });
              
              if (product) {
                productId = product.id;
              }
            }

            // Create order item
            await prisma.orderItem.create({
              data: {
                wooId: itemId,
                name: item.order_item_name || 'Unknown Product',
                quantity,
                price: unitPrice,
                total: lineTotal,
                sku: null, // SKU would require additional product lookup
                orderId: order.id,
                productId,
              },
            });

            result.orderItemsCreated++;

          } catch (itemError) {
            console.error(`Error syncing order item ${item.order_item_id}:`, itemError);
          }
        }

      } catch (orderError) {
        console.error(`Error syncing order ${p.ID}:`, orderError);
        result.errors++;
      }
    }

    // Update last sync timestamp
    await prisma.store.update({
      where: { id: store.id },
      data: { lastOrderSyncAt: new Date() },
    });

    console.log(`Orders sync complete:`, result);

    return result;

  } finally {
    await closeWooDB(db);
  }
}

/**
 * Sync all orders (full sync)
 * 
 * @param store Store object with database credentials
 * @returns Sync results with counts
 */
export async function syncOrdersFull(store: {
  id: string;
  dbHost: string;
  dbUser: string;
  dbPassword: string;
  dbName: string;
  dbPrefix?: string;
}): Promise<SyncOrdersResult> {
  return syncOrdersIncremental({
    ...store,
    lastOrderSyncAt: new Date('1970-01-01T00:00:00Z'),
  });
}

