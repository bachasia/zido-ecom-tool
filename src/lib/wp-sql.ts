/**
 * WordPress SQL Utilities
 * 
 * Helper functions for working with dynamic WordPress table prefixes
 */

export interface WPStore {
  dbPrefix?: string;
}

/**
 * Get WordPress table name with prefix
 * 
 * Sanitizes the prefix and returns a properly quoted table name.
 * Default prefix is 'wp_' if not specified.
 * 
 * @param store Store object with dbPrefix
 * @param tableName Base table name (e.g., 'posts', 'postmeta', 'users')
 * @returns Quoted table name with prefix (e.g., `wp_posts`)
 * 
 * @example
 * wpTable(store, 'posts') // Returns: `wp_posts`
 * wpTable({ dbPrefix: 'custom_' }, 'postmeta') // Returns: `custom_postmeta`
 */
export function wpTable(store: WPStore, tableName: string): string {
  // Get prefix, default to 'wp_'
  const rawPrefix = store.dbPrefix || 'wp_';
  
  // Sanitize prefix: only allow alphanumeric and underscore
  const prefix = rawPrefix.replace(/[^A-Za-z0-9_]/g, '');
  
  // Validate prefix is not empty after sanitization
  if (!prefix) {
    throw new Error('Invalid table prefix: must contain at least one alphanumeric character or underscore');
  }
  
  // Sanitize table name
  const sanitizedTableName = tableName.replace(/[^A-Za-z0-9_]/g, '');
  
  if (!sanitizedTableName) {
    throw new Error('Invalid table name: must contain at least one alphanumeric character or underscore');
  }
  
  // Return quoted table name
  return `\`${prefix}${sanitizedTableName}\``;
}

/**
 * Validate WordPress table prefix
 * 
 * Checks if the prefix is valid and ends with underscore
 * 
 * @param prefix Table prefix to validate
 * @returns True if valid, false otherwise
 */
export function isValidPrefix(prefix: string): boolean {
  // Check format: alphanumeric + underscore, ideally ends with underscore
  return /^[A-Za-z0-9_]+$/.test(prefix) && prefix.endsWith('_');
}

/**
 * Normalize WordPress table prefix
 * 
 * Ensures prefix ends with underscore and is sanitized
 * 
 * @param prefix Raw prefix
 * @returns Normalized prefix
 */
export function normalizePrefix(prefix: string): string {
  // Sanitize
  let normalized = prefix.replace(/[^A-Za-z0-9_]/g, '');
  
  // Ensure ends with underscore
  if (!normalized.endsWith('_')) {
    normalized += '_';
  }
  
  return normalized;
}

/**
 * Get common WordPress table names with prefix
 * 
 * @param store Store object with dbPrefix
 * @returns Object with common table names
 */
export function getWPTables(store: WPStore) {
  return {
    posts: wpTable(store, 'posts'),
    postmeta: wpTable(store, 'postmeta'),
    users: wpTable(store, 'users'),
    usermeta: wpTable(store, 'usermeta'),
    comments: wpTable(store, 'comments'),
    commentmeta: wpTable(store, 'commentmeta'),
    terms: wpTable(store, 'terms'),
    termTaxonomy: wpTable(store, 'term_taxonomy'),
    termRelationships: wpTable(store, 'term_relationships'),
    options: wpTable(store, 'options'),
    // WooCommerce specific
    woocommerceOrderItems: wpTable(store, 'woocommerce_order_items'),
    woocommerceOrderItemMeta: wpTable(store, 'woocommerce_order_itemmeta'),
    woocommerceSessions: wpTable(store, 'woocommerce_sessions'),
    woocommerceApiKeys: wpTable(store, 'woocommerce_api_keys'),
    woocommerceAttributeTaxonomies: wpTable(store, 'woocommerce_attribute_taxonomies'),
    woocommerceDownloadableProductPermissions: wpTable(store, 'woocommerce_downloadable_product_permissions'),
    woocommercePaymentTokens: wpTable(store, 'woocommerce_payment_tokens'),
    woocommercePaymentTokenMeta: wpTable(store, 'woocommerce_payment_tokenmeta'),
    woocommerceShippingZones: wpTable(store, 'woocommerce_shipping_zones'),
    woocommerceShippingZoneLocations: wpTable(store, 'woocommerce_shipping_zone_locations'),
    woocommerceShippingZoneMethods: wpTable(store, 'woocommerce_shipping_zone_methods'),
    woocommerceTaxRates: wpTable(store, 'woocommerce_tax_rates'),
    woocommerceTaxRateLocations: wpTable(store, 'woocommerce_tax_rate_locations'),
  };
}

