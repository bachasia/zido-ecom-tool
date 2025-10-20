-- CreateTable
CREATE TABLE "order_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "wooId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price" REAL NOT NULL,
    "total" REAL NOT NULL,
    "sku" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_accounts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT
);
INSERT INTO "new_accounts" ("access_token", "expires_at", "id", "id_token", "provider", "providerAccountId", "refresh_token", "scope", "session_state", "token_type", "type", "userId") SELECT "access_token", "expires_at", "id", "id_token", "provider", "providerAccountId", "refresh_token", "scope", "session_state", "token_type", "type", "userId" FROM "accounts";
DROP TABLE "accounts";
ALTER TABLE "new_accounts" RENAME TO "accounts";
CREATE UNIQUE INDEX "accounts_provider_providerAccountId_key" ON "accounts"("provider", "providerAccountId");
CREATE TABLE "new_customers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "wooId" INTEGER NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "dateCreated" DATETIME NOT NULL,
    "dateUpdated" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "storeId" TEXT NOT NULL
);
INSERT INTO "new_customers" ("createdAt", "dateCreated", "dateUpdated", "email", "firstName", "id", "lastName", "storeId", "updatedAt", "wooId") SELECT "createdAt", "dateCreated", "dateUpdated", "email", "firstName", "id", "lastName", "storeId", "updatedAt", "wooId" FROM "customers";
DROP TABLE "customers";
ALTER TABLE "new_customers" RENAME TO "customers";
CREATE UNIQUE INDEX "customers_storeId_wooId_key" ON "customers"("storeId", "wooId");
CREATE TABLE "new_orders" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "wooId" INTEGER NOT NULL,
    "name" TEXT,
    "total" REAL NOT NULL,
    "status" TEXT,
    "dateCreated" DATETIME NOT NULL,
    "dateUpdated" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "billingFirstName" TEXT,
    "billingLastName" TEXT,
    "billingEmail" TEXT,
    "billingPhone" TEXT,
    "billingCompany" TEXT,
    "billingAddress1" TEXT,
    "billingAddress2" TEXT,
    "billingCity" TEXT,
    "billingState" TEXT,
    "billingPostcode" TEXT,
    "billingCountry" TEXT,
    "shippingFirstName" TEXT,
    "shippingLastName" TEXT,
    "shippingCompany" TEXT,
    "shippingAddress1" TEXT,
    "shippingAddress2" TEXT,
    "shippingCity" TEXT,
    "shippingState" TEXT,
    "shippingPostcode" TEXT,
    "shippingCountry" TEXT,
    "paymentMethod" TEXT,
    "paymentMethodTitle" TEXT,
    "transactionId" TEXT,
    "currency" TEXT,
    "discountTotal" REAL,
    "shippingTotal" REAL,
    "taxTotal" REAL,
    "subtotal" REAL,
    "customerId" TEXT,
    "storeId" TEXT NOT NULL
);
INSERT INTO "new_orders" ("createdAt", "dateCreated", "dateUpdated", "id", "name", "status", "storeId", "total", "updatedAt", "wooId") SELECT "createdAt", "dateCreated", "dateUpdated", "id", "name", "status", "storeId", "total", "updatedAt", "wooId" FROM "orders";
DROP TABLE "orders";
ALTER TABLE "new_orders" RENAME TO "orders";
CREATE UNIQUE INDEX "orders_storeId_wooId_key" ON "orders"("storeId", "wooId");
CREATE TABLE "new_products" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "wooId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "price" REAL,
    "status" TEXT,
    "dateCreated" DATETIME NOT NULL,
    "dateUpdated" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "storeId" TEXT NOT NULL
);
INSERT INTO "new_products" ("createdAt", "dateCreated", "dateUpdated", "id", "name", "price", "status", "storeId", "updatedAt", "wooId") SELECT "createdAt", "dateCreated", "dateUpdated", "id", "name", "price", "status", "storeId", "updatedAt", "wooId" FROM "products";
DROP TABLE "products";
ALTER TABLE "new_products" RENAME TO "products";
CREATE UNIQUE INDEX "products_storeId_wooId_key" ON "products"("storeId", "wooId");
CREATE TABLE "new_sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" DATETIME NOT NULL
);
INSERT INTO "new_sessions" ("expires", "id", "sessionToken", "userId") SELECT "expires", "id", "sessionToken", "userId" FROM "sessions";
DROP TABLE "sessions";
ALTER TABLE "new_sessions" RENAME TO "sessions";
CREATE UNIQUE INDEX "sessions_sessionToken_key" ON "sessions"("sessionToken");
CREATE TABLE "new_stores" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "consumerKeyCiphertext" TEXT NOT NULL,
    "consumerKeyIv" TEXT NOT NULL,
    "consumerKeyTag" TEXT NOT NULL,
    "consumerSecretCiphertext" TEXT NOT NULL,
    "consumerSecretIv" TEXT NOT NULL,
    "consumerSecretTag" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "ownerId" TEXT
);
INSERT INTO "new_stores" ("consumerKeyCiphertext", "consumerKeyIv", "consumerKeyTag", "consumerSecretCiphertext", "consumerSecretIv", "consumerSecretTag", "createdAt", "id", "name", "ownerId", "updatedAt", "url") SELECT "consumerKeyCiphertext", "consumerKeyIv", "consumerKeyTag", "consumerSecretCiphertext", "consumerSecretIv", "consumerSecretTag", "createdAt", "id", "name", "ownerId", "updatedAt", "url" FROM "stores";
DROP TABLE "stores";
ALTER TABLE "new_stores" RENAME TO "stores";
CREATE UNIQUE INDEX "stores_url_key" ON "stores"("url");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "order_items_orderId_wooId_key" ON "order_items"("orderId", "wooId");
