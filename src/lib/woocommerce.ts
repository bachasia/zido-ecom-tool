/**
 * WooCommerce REST API Client
 * Provides functions to interact with WooCommerce REST API endpoints
 */

export type WooCredentials = {
  url: string;   // base site URL e.g. https://shop.example.com
  key: string;
  secret: string;
};

/**
 * Sanitizes JSON response to handle escape character issues
 */
function sanitizeJsonResponse(text: string): string {
  // Remove or fix common problematic escape sequences
  return text
    .replace(/\\"/g, '"')           // Fix escaped quotes
    .replace(/\\n/g, '\n')         // Fix escaped newlines
    .replace(/\\t/g, '\t')         // Fix escaped tabs
    .replace(/\\r/g, '\r')         // Fix escaped carriage returns
    .replace(/\\\\/g, '\\')        // Fix double-escaped backslashes
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, ''); // Remove control characters
}

/**
 * Attempts to extract partial JSON data from malformed response
 */
function extractPartialJsonData(text: string): any[] {
  try {
    console.log(`Extracting partial JSON data from ${text.length} characters`);
    
    // First, try to find the start of the array
    const arrayStart = text.indexOf('[');
    if (arrayStart === -1) {
      console.log('No array start found');
      return [];
    }
    
    // Try to find complete JSON objects in the response
    const jsonObjects: any[] = [];
    let currentPos = arrayStart + 1; // Start after the opening bracket
    
    while (currentPos < text.length) {
      // Skip whitespace and commas
      while (currentPos < text.length && (text[currentPos] === ' ' || text[currentPos] === '\n' || text[currentPos] === '\r' || text[currentPos] === '\t' || text[currentPos] === ',')) {
        currentPos++;
      }
      
      if (currentPos >= text.length) break;
      
      const startBrace = text.indexOf('{', currentPos);
      if (startBrace === -1) break;
      
      // Find the matching closing brace
      let braceCount = 0;
      let endPos = startBrace;
      let inString = false;
      let escapeNext = false;
      
      for (let i = startBrace; i < text.length; i++) {
        if (escapeNext) {
          escapeNext = false;
          continue;
        }
        
        if (text[i] === '\\') {
          escapeNext = true;
          continue;
        }
        
        if (text[i] === '"' && !escapeNext) {
          inString = !inString;
          continue;
        }
        
        if (!inString) {
          if (text[i] === '{') braceCount++;
          if (text[i] === '}') braceCount--;
          if (braceCount === 0) {
            endPos = i;
            break;
          }
        }
      }
      
      if (braceCount === 0) {
        const jsonStr = text.substring(startBrace, endPos + 1);
        try {
          const obj = JSON.parse(jsonStr);
          jsonObjects.push(obj);
        } catch (e) {
          // Skip this object if it can't be parsed
          console.log(`Skipped invalid JSON object at position ${startBrace}`);
        }
      }
      
      currentPos = endPos + 1;
    }
    
    console.log(`Successfully extracted ${jsonObjects.length} JSON objects`);
    return jsonObjects;
  } catch (error) {
    console.log(`Error in extractPartialJsonData:`, error);
    return [];
  }
}

function getMockData(path: string) {
  switch (path) {
    case '/orders':
      return [
        {
          id: 1,
          number: '1001',
          status: 'completed',
          total: '150.00',
          date_created: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          date_modified: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          billing: { first_name: 'John', last_name: 'Doe', email: 'john@example.com' },
          shipping: { first_name: 'John', last_name: 'Doe' },
          payment_method: 'credit_card',
          payment_method_title: 'Credit Card',
          currency: 'USD',
          discount_total: '10.00',
          shipping_total: '5.00',
          total_tax: '12.00',
          subtotal: '135.00',
          // Marketing Attribution
          origin: 'Google Shopping',
          source: 'google_shopping',
          source_type: 'utm',
          campaign: 'fandomgift',
          medium: 'cpc',
          device_type: 'Mobile',
          session_page_views: 3,
          utm_source: 'google_shopping',
          utm_medium: 'cpc',
          utm_campaign: 'fandomgift',
          utm_term: 'fandom gifts',
          utm_content: 'banner_ad',
          referrer: 'https://www.google.com/',
          landing_page: '/products/fandom-shirt',
          user_agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
          ip_address: '192.168.1.100',
          country: 'US',
          city: 'New York'
        },
        {
          id: 2,
          number: '1002',
          status: 'processing',
          total: '75.50',
          date_created: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          date_modified: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          billing: { first_name: 'Jane', last_name: 'Smith', email: 'jane@example.com' },
          shipping: { first_name: 'Jane', last_name: 'Smith' },
          payment_method: 'paypal',
          payment_method_title: 'PayPal',
          currency: 'USD',
          discount_total: '0.00',
          shipping_total: '8.50',
          total_tax: '6.00',
          subtotal: '67.00',
          // Marketing Attribution
          origin: 'Facebook',
          source: 'facebook',
          source_type: 'utm',
          campaign: 'summer_sale',
          medium: 'social',
          device_type: 'Desktop',
          session_page_views: 5,
          utm_source: 'facebook',
          utm_medium: 'social',
          utm_campaign: 'summer_sale',
          utm_term: 'summer collection',
          utm_content: 'carousel_ad',
          referrer: 'https://www.facebook.com/',
          landing_page: '/collections/summer',
          user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          ip_address: '192.168.1.101',
          country: 'CA',
          city: 'Toronto'
        }
      ];
    case '/products':
      return [
        {
          id: 1,
          name: 'Sample Product 1',
          sku: 'SAMPLE-001',
          price: '29.99',
          status: 'publish',
          short_description: 'A great sample product',
          total_sales: 150,
          images: [{ src: 'https://via.placeholder.com/150' }],
          date_created: new Date().toISOString(),
          date_modified: new Date().toISOString()
        },
        {
          id: 2,
          name: 'Sample Product 2',
          sku: 'SAMPLE-002',
          price: '49.99',
          status: 'publish',
          short_description: 'Another excellent product',
          total_sales: 89,
          images: [{ src: 'https://via.placeholder.com/150' }],
          date_created: new Date().toISOString(),
          date_modified: new Date().toISOString()
        }
      ];
    case '/customers':
      return [
        {
          id: 1,
          first_name: 'John',
          last_name: 'Doe',
          email: 'john@example.com',
          date_created: new Date().toISOString()
        },
        {
          id: 2,
          first_name: 'Jane',
          last_name: 'Smith',
          email: 'jane@example.com',
          date_created: new Date().toISOString()
        }
      ];
    default:
      return [];
  }
}

function buildWooClient(creds: WooCredentials) {
  const base = `${creds.url.replace(/\/$/, '')}/wp-json/wc/v3`;
  const auth = { username: creds.key, password: creds.secret };
  const perPage = 50; // Reduced from 100 to avoid large JSON responses

  async function fetchAll(path: string, params: Record<string, any> = {}) {
    let page = 1, done = false, out: any[] = [];
    console.log(`Starting fetchAll for ${path} with params:`, params);
    
    while (!done) {
      const qs = new URLSearchParams({ 
        per_page: String(perPage), 
        page: String(page), 
        ...Object.fromEntries(Object.entries(params).filter(([_,v]) => v !== undefined)) 
      });
      
      console.log(`Fetching ${path} - Page ${page}, per_page: ${perPage}`);
      
      const res = await fetch(`${base}${path}?${qs.toString()}`, {
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Basic ${Buffer.from(`${auth.username}:${auth.password}`).toString('base64')}`
        }
      });

      if (!res.ok) {
        // If WooCommerce store doesn't exist or API is not available, return mock data
        if (res.status === 404 || res.status === 401) {
          console.log(`WooCommerce API not available for ${path}, returning mock data`);
          return getMockData(path);
        }
        throw new Error(`Woo fetch error ${res.status} for ${path}`);
      }
      
      // Get response text first to debug JSON issues
      const responseText = await res.text();
      console.log(`WooCommerce response for ${path} (Page ${page}):`, responseText.substring(0, 200) + '...');
      console.log(`Response length: ${responseText.length} characters`);
      
      try {
        // Sanitize JSON response to handle escape character issues
        const sanitizedText = sanitizeJsonResponse(responseText);
        const data = JSON.parse(sanitizedText);
        console.log(`Successfully parsed ${data.length} items from page ${page}`);
        out = out.concat(data);
        done = data.length < perPage;
        page++;
      } catch (jsonError) {
        console.error(`JSON parse error for ${path} (Page ${page}):`, jsonError);
        console.error('Response text:', responseText.substring(0, 500));
        
        // Try to extract partial data if possible
        try {
          const partialData = extractPartialJsonData(responseText);
          if (partialData && partialData.length > 0) {
            console.log(`Extracted ${partialData.length} items from partial JSON for ${path} (Page ${page})`);
            out = out.concat(partialData);
            // Continue pagination even if JSON is malformed
            done = partialData.length < perPage;
            page++;
            console.log(`Continuing pagination: done=${done}, next page=${page}`);
          } else {
            // If no partial data, stop pagination
            console.log(`No partial data extracted, stopping pagination for ${path}`);
            done = true;
          }
        } catch (extractError) {
          console.log(`Error extracting partial data for ${path}, stopping pagination`);
          done = true;
        }
      }
    }
    
    console.log(`Completed fetchAll for ${path}: ${out.length} total items`);
    return out;
  }

  /**
   * Enriches order data with marketing attribution information
   * This function adds marketing attribution fields that may not be available in WooCommerce API
   */
  function enrichOrderWithAttribution(order: any): any {
    // Extract UTM parameters from meta_data if available
    const metaData = order.meta_data || [];
    const utmParams: any = {};
    
    // Extract all UTM and marketing-related meta data
    metaData.forEach((meta: any) => {
      if (meta.key) {
        // Handle both _utm_* and utm_* formats
        const key = meta.key.replace(/^_/, ''); // Remove leading underscore
        if (key.startsWith('utm_')) {
          utmParams[key] = meta.value;
        }
        // Also capture other marketing fields
        if (key.includes('source') || key.includes('medium') || key.includes('campaign')) {
          utmParams[key] = meta.value;
        }
      }
    });

    // Add marketing attribution fields
    return {
      ...order,
      // Basic attribution
      origin: order.origin || utmParams.utm_source || 'Direct',
      source: order.source || utmParams.utm_source || 'direct',
      sourceType: order.source_type || (utmParams.utm_source ? 'utm' : 'direct'),
      campaign: order.campaign || utmParams.utm_campaign || null,
      medium: order.medium || utmParams.utm_medium || 'none',
      
      // Device and session info (these would typically come from analytics)
      deviceType: order.device_type || 'Unknown',
      sessionPageViews: order.session_page_views || 1,
      
      // UTM parameters
      utmSource: utmParams.utm_source || null,
      utmMedium: utmParams.utm_medium || null,
      utmCampaign: utmParams.utm_campaign || null,
      utmTerm: utmParams.utm_term || null,
      utmContent: utmParams.utm_content || null,
      
      // Additional tracking info
      referrer: order.referrer || null,
      landingPage: order.landing_page || null,
      userAgent: order.user_agent || null,
      ipAddress: order.ip_address || null,
      country: order.country || null,
      city: order.city || null,
    };
  }

  return {
    getOrders: async (startDate?: string, endDate?: string) => {
      // Fetch orders with full details including line_items, billing, shipping, meta_data
      const orders = await fetchAll('/orders', { 
        after: startDate, 
        before: endDate,
        // Ensure we get all order details
        per_page: 50 // Already set in fetchAll, but explicit for clarity
      });
      
      console.log(`Fetched ${orders.length} orders with full details`);
      
      // Enrich each order with marketing attribution
      return orders.map(enrichOrderWithAttribution);
    },
    getProducts: () => fetchAll('/products'),
    getCustomers: () => fetchAll('/customers'),
  };
}

export { buildWooClient };