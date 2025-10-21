-- AlterTable
ALTER TABLE "products" ADD COLUMN "description" TEXT;
ALTER TABLE "products" ADD COLUMN "imageUrl" TEXT;
ALTER TABLE "products" ADD COLUMN "sku" TEXT;
ALTER TABLE "products" ADD COLUMN "totalSalesWoo" INTEGER;
ALTER TABLE "products" ADD COLUMN "totalSold" INTEGER;

-- AlterTable
ALTER TABLE "stores" ADD COLUMN "dbHost" TEXT;
ALTER TABLE "stores" ADD COLUMN "dbName" TEXT;
ALTER TABLE "stores" ADD COLUMN "dbPassword" TEXT;
ALTER TABLE "stores" ADD COLUMN "dbPrefix" TEXT;
ALTER TABLE "stores" ADD COLUMN "dbUser" TEXT;
ALTER TABLE "stores" ADD COLUMN "lastCustomerSyncAt" DATETIME;
ALTER TABLE "stores" ADD COLUMN "lastOrderSyncAt" DATETIME;
ALTER TABLE "stores" ADD COLUMN "lastProductSyncAt" DATETIME;
ALTER TABLE "stores" ADD COLUMN "syncMethod" TEXT;
