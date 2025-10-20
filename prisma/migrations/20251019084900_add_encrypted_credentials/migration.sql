/*
  Warnings:

  - You are about to drop the column `consumerKey` on the `stores` table. All the data in the column will be lost.
  - You are about to drop the column `consumerSecret` on the `stores` table. All the data in the column will be lost.
  - Added the required column `consumerKeyCiphertext` to the `stores` table without a default value. This is not possible if the table is not empty.
  - Added the required column `consumerKeyIv` to the `stores` table without a default value. This is not possible if the table is not empty.
  - Added the required column `consumerKeyTag` to the `stores` table without a default value. This is not possible if the table is not empty.
  - Added the required column `consumerSecretCiphertext` to the `stores` table without a default value. This is not possible if the table is not empty.
  - Added the required column `consumerSecretIv` to the `stores` table without a default value. This is not possible if the table is not empty.
  - Added the required column `consumerSecretTag` to the `stores` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
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
    "storeId" TEXT NOT NULL,
    CONSTRAINT "customers_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores" ("id") ON DELETE CASCADE ON UPDATE CASCADE
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
    "storeId" TEXT NOT NULL,
    CONSTRAINT "orders_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores" ("id") ON DELETE CASCADE ON UPDATE CASCADE
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
    "storeId" TEXT NOT NULL,
    CONSTRAINT "products_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_products" ("createdAt", "dateCreated", "dateUpdated", "id", "name", "price", "status", "storeId", "updatedAt", "wooId") SELECT "createdAt", "dateCreated", "dateUpdated", "id", "name", "price", "status", "storeId", "updatedAt", "wooId" FROM "products";
DROP TABLE "products";
ALTER TABLE "new_products" RENAME TO "products";
CREATE UNIQUE INDEX "products_storeId_wooId_key" ON "products"("storeId", "wooId");
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
    "ownerId" TEXT,
    CONSTRAINT "stores_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_stores" ("createdAt", "id", "name", "ownerId", "updatedAt", "url") SELECT "createdAt", "id", "name", "ownerId", "updatedAt", "url" FROM "stores";
DROP TABLE "stores";
ALTER TABLE "new_stores" RENAME TO "stores";
CREATE UNIQUE INDEX "stores_url_key" ON "stores"("url");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
