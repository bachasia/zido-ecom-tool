# Diagnostics API Usage Guide

## Quick Start

### 1. Run Diagnostics via Browser

Navigate to (replace `<storeId>` with your actual store ID):
```
http://localhost:3000/api/diagnostics?storeId=<storeId>
```

### 2. Run Diagnostics via curl

```bash
curl "http://localhost:3000/api/diagnostics?storeId=cmgxw8k9z02qzgq398ygeuh45" \
  -H "Cookie: next-auth.session-token=<your-session-token>"
```

## Response Structure

```json
{
  "success": true,
  "storeId": "cmgxw8k9z02qzgq398ygeuh45",
  "storeName": "My Store",
  "diagnostics": {
    "orphanOrderItems": [...],      // Order items with missing products
    "productIssues": [...],          // Products with data issues
    "missingProducts": [...],        // Products in orders but not synced
    "storeStats": {...}              // Overall statistics
  },
  "summary": {
    "orphan_items_count": 0,
    "product_issues_count": 5,
    "missing_products_count": 0,
    "health_score": 92               // 0-100 score
  }
}
```

## Understanding the Results

### 1. Orphan Order Items

**What:** Order items that reference non-existent products in the products table.

**Why it happens:**
- Product was deleted after order was placed
- Sync failed to fetch the product from WooCommerce
- Product ID mismatch between order and product

**Example:**
```json
{
  "id": "...",
  "wooId": 12345,
  "item_name": "Blue T-Shirt",
  "quantity": 2,
  "total": 59.98,
  "productId": "prod_xyz",
  "order_wooId": 1001,
  "order_date": "2025-10-15T..."
}
```

**How to fix:**
- Re-run product sync
- Manually create missing products
- Update order items to link to correct products

### 2. Product Issues

**What:** Products with missing or incorrect data.

**Types of issues:**
- `missingImage: true` - No thumbnail/featured image
- `missingSku: true` - No SKU assigned
- `salesMismatch: true` - `totalSalesWoo` differs from `totalSold` by >5 units

**Example:**
```json
{
  "id": "prod_abc",
  "wooId": 456,
  "name": "Red Hoodie",
  "totalSalesWoo": 150,
  "totalSold": 145,
  "imageUrl": null,
  "sku": "HOODIE-RED",
  "missingImage": true,
  "missingSku": false,
  "salesMismatch": false
}
```

**How to fix:**
- Missing images: Update product in WooCommerce with featured image
- Missing SKUs: Assign SKUs in WooCommerce
- Sales mismatch: Re-run sync to recalculate `totalSold`

### 3. Missing Products

**What:** Products that appear in order items but don't exist in the products table.

**Example:**
```json
{
  "product_name": "Limited Edition Jacket",
  "product_sku": "JACKET-LE-001",
  "order_count": 12,
  "total_quantity": 15,
  "total_revenue": 1499.88
}
```

**How to fix:**
- Run full product sync
- Check if products are published in WooCommerce
- Verify WooCommerce API access

### 4. Store Statistics

**Metrics:**
- `total_products` - Total products in database
- `products_with_images` - Products with featured image
- `products_with_sku` - Products with SKU assigned
- `products_with_woo_sales` - Products with WooCommerce sales data
- `products_with_calculated_sales` - Products with computed sales
- `total_orders` - Total orders synced
- `total_order_items` - Total line items across all orders
- `total_customers` - Total customers synced
- `image_completion_rate` - % of products with images (e.g., "90.5")
- `sku_completion_rate` - % of products with SKUs (e.g., "96.0")

## Health Score Interpretation

| Score | Status | Action Required |
|-------|--------|-----------------|
| 90-100 | ✅ Excellent | No action needed |
| 75-89 | ⚠️ Good | Minor improvements recommended |
| 50-74 | ⚠️ Fair | Review and fix reported issues |
| 0-49 | ❌ Poor | Immediate attention required |

## Common Workflows

### Workflow 1: After Full Sync

1. **Run sync:**
   - Click "Sync Data" button in dashboard
   - Or call `/api/sync` endpoint

2. **Check diagnostics:**
   ```bash
   curl "http://localhost:3000/api/diagnostics?storeId=<id>"
   ```

3. **Review health score:**
   - Score < 90? → Check `productIssues` array
   - Has orphan items? → Re-sync products
   - Missing products? → Check WooCommerce product status

### Workflow 2: Troubleshooting Sync Issues

1. **Sync fails or seems incomplete:**
   ```bash
   # Check diagnostics
   curl "http://localhost:3000/api/diagnostics?storeId=<id>"
   ```

2. **Look for patterns:**
   - Many orphan items → Product sync failed
   - Missing images → WooCommerce products need images
   - Sales mismatch → Re-run sync to recalculate

3. **Fix and re-sync:**
   - Fix issues in WooCommerce
   - Re-run sync
   - Verify health score improved

### Workflow 3: Monitoring Data Quality

1. **Set up regular checks:**
   - Run diagnostics daily/weekly
   - Track health score over time
   - Set up alerts for score < 80

2. **Review completion rates:**
   - Target: 95%+ image completion
   - Target: 98%+ SKU completion
   - Target: 0 orphan items

3. **Maintain quality:**
   - Ensure all WooCommerce products have images
   - Assign SKUs to all products
   - Keep products published and available

## SQL Queries for Manual Investigation

### Find Products Without Images
```sql
SELECT wooId, name, status, price
FROM products
WHERE storeId = '<store-id>'
  AND imageUrl IS NULL
ORDER BY name;
```

### Check Sales Mismatches
```sql
SELECT 
  wooId,
  name,
  totalSalesWoo,
  totalSold,
  ABS(totalSalesWoo - totalSold) as difference
FROM products
WHERE storeId = '<store-id>'
  AND totalSalesWoo IS NOT NULL
  AND totalSold IS NOT NULL
  AND ABS(totalSalesWoo - totalSold) > 5
ORDER BY difference DESC;
```

### Find Orphan Order Items
```sql
SELECT 
  oi.id,
  oi.name as item_name,
  oi.quantity,
  oi.total,
  o.wooId as order_id
FROM order_items oi
INNER JOIN orders o ON oi.orderId = o.id
LEFT JOIN products p ON oi.productId = p.id
WHERE o.storeId = '<store-id>'
  AND p.id IS NULL;
```

### Product Sales Calculation
```sql
SELECT 
  p.wooId,
  p.name,
  p.totalSalesWoo as woo_sales,
  SUM(oi.quantity) as calculated_sales,
  COUNT(DISTINCT oi.orderId) as order_count
FROM products p
LEFT JOIN order_items oi ON p.id = oi.productId
WHERE p.storeId = '<store-id>'
GROUP BY p.wooId, p.name, p.totalSalesWoo
ORDER BY calculated_sales DESC
LIMIT 20;
```

## Integration Examples

### React Component
```typescript
import { useState, useEffect } from 'react'

function DiagnosticsPanel({ storeId }: { storeId: string }) {
  const [diagnostics, setDiagnostics] = useState(null)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    async function fetchDiagnostics() {
      const res = await fetch(`/api/diagnostics?storeId=${storeId}`)
      const data = await res.json()
      setDiagnostics(data)
      setLoading(false)
    }
    fetchDiagnostics()
  }, [storeId])
  
  if (loading) return <div>Loading...</div>
  
  const { summary, diagnostics: data } = diagnostics
  
  return (
    <div>
      <h2>Data Quality Report</h2>
      <div>Health Score: {summary.health_score}/100</div>
      <div>Orphan Items: {summary.orphan_items_count}</div>
      <div>Product Issues: {summary.product_issues_count}</div>
      
      <h3>Statistics</h3>
      <div>Image Completion: {data.storeStats.image_completion_rate}%</div>
      <div>SKU Completion: {data.storeStats.sku_completion_rate}%</div>
    </div>
  )
}
```

### CLI Tool
```bash
#!/bin/bash
# check-health.sh

STORE_ID="cmgxw8k9z02qzgq398ygeuh45"
THRESHOLD=80

HEALTH=$(curl -s "http://localhost:3000/api/diagnostics?storeId=$STORE_ID" \
  | jq -r '.summary.health_score')

if [ "$HEALTH" -lt "$THRESHOLD" ]; then
  echo "⚠️  Health score $HEALTH is below threshold $THRESHOLD"
  exit 1
else
  echo "✅ Health score: $HEALTH"
  exit 0
fi
```

## Best Practices

### 1. Regular Monitoring
- Run diagnostics after each sync
- Set up daily health score checks
- Alert on health score drops

### 2. Data Quality Standards
- Maintain 95%+ image completion
- Maintain 98%+ SKU completion
- Zero orphan items target
- Sales mismatch < 5% of products

### 3. Sync Frequency
- Full sync: Weekly
- Incremental sync: Daily
- Diagnostics check: After each sync

### 4. Issue Resolution
- Fix orphan items immediately
- Update missing images within 24h
- Assign missing SKUs within 48h
- Investigate sales mismatches > 10 units

## Troubleshooting

### Health Score is Low (< 50)

**Possible causes:**
1. Initial sync hasn't completed
2. Many products missing images
3. WooCommerce products not properly configured
4. Orphan order items from deleted products

**Solutions:**
1. Complete full sync
2. Update WooCommerce products with images
3. Assign SKUs to all products
4. Clean up orphan items

### Orphan Items Keep Appearing

**Possible causes:**
1. Products being deleted in WooCommerce
2. Product IDs changing
3. Sync not fetching all products

**Solutions:**
1. Don't delete products, set to draft instead
2. Re-run full product sync
3. Check WooCommerce API pagination

### Sales Mismatch Issues

**Possible causes:**
1. Orders synced before products
2. Calculation timing issues
3. Multi-store products

**Solutions:**
1. Sync products first, then orders
2. Re-run sync to recalculate totalSold
3. Verify storeId filtering in queries

## Support

For issues or questions:
1. Check PRODUCT_SYNC_AUDIT.md for technical details
2. Review terminal logs during sync
3. Inspect database with SQL queries above
4. Check WooCommerce API response in logs

