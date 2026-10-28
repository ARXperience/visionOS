-- inventario_optica
--
-- Generada con scripts/migracion.mjs: lee la base, no la toca.
-- Se filtraron 3 borrados que el datamodel no conoce:
--   churn de clave foránea: audit_logs_person_id_fkey
--   DROP INDEX "persons_doc_idx";
--   DROP INDEX "persons_name_trgm";

-- CreateEnum
CREATE TYPE "ProductKind" AS ENUM ('INSUMO', 'MEDICAMENTO', 'MATERIAL_QUIRURGICO', 'LENTE_INTRAOCULAR', 'MONTURA', 'LENTE_OFTALMICO', 'LENTE_CONTACTO', 'OTRO');

-- CreateEnum
CREATE TYPE "StockMoveKind" AS ENUM ('ENTRADA', 'SALIDA', 'AJUSTE', 'TRASLADO_SALIDA', 'TRASLADO_ENTRADA', 'BAJA');

-- CreateEnum
CREATE TYPE "OpticalOrderStatus" AS ENUM ('TOMADA', 'EN_LABORATORIO', 'RECIBIDA', 'ENTREGADA', 'ANULADA');

-- CreateTable
CREATE TABLE "products" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "ProductKind" NOT NULL,
    "brand" TEXT,
    "model" TEXT,
    "unit" TEXT NOT NULL DEFAULT 'unidad',
    "invima" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "tracks_lot" BOOLEAN NOT NULL DEFAULT false,
    "min_qty" INTEGER NOT NULL DEFAULT 0,
    "sale_price" DECIMAL(14,2),
    "cost_price" DECIMAL(14,2),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_levels" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "product_id" UUID NOT NULL,
    "site_id" UUID NOT NULL,
    "lot" TEXT NOT NULL DEFAULT '',
    "expires_at" DATE,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "min_qty" INTEGER,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "stock_levels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_movements" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "product_id" UUID NOT NULL,
    "site_id" UUID NOT NULL,
    "kind" "StockMoveKind" NOT NULL,
    "lot" TEXT NOT NULL DEFAULT '',
    "expires_at" DATE,
    "quantity" INTEGER NOT NULL,
    "balance" INTEGER NOT NULL,
    "reason" TEXT,
    "ref_type" TEXT,
    "ref_id" UUID,
    "unit_cost" DECIMAL(14,2),
    "created_by_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prescriptions" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "person_id" UUID NOT NULL,
    "professional_id" UUID NOT NULL,
    "appointment_id" UUID,
    "issued_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "valid_to" DATE,
    "od_sphere" DECIMAL(5,2),
    "od_cylinder" DECIMAL(5,2),
    "od_axis" INTEGER,
    "od_add" DECIMAL(5,2),
    "od_prism" TEXT,
    "oi_sphere" DECIMAL(5,2),
    "oi_cylinder" DECIMAL(5,2),
    "oi_axis" INTEGER,
    "oi_add" DECIMAL(5,2),
    "oi_prism" TEXT,
    "pupillary_distance" DECIMAL(5,1),
    "lens_type" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prescriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "optical_orders" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "number" TEXT NOT NULL,
    "status" "OpticalOrderStatus" NOT NULL DEFAULT 'TOMADA',
    "person_id" UUID NOT NULL,
    "site_id" UUID NOT NULL,
    "prescription_id" UUID NOT NULL,
    "frame_product_id" UUID,
    "frame_own" BOOLEAN NOT NULL DEFAULT false,
    "frame_note" TEXT,
    "lens_product_id" UUID,
    "lens_note" TEXT,
    "lab" TEXT,
    "promised_at" DATE,
    "sent_at" TIMESTAMPTZ(3),
    "received_at" TIMESTAMPTZ(3),
    "delivered_at" TIMESTAMPTZ(3),
    "delivered_to" TEXT,
    "warranty_months" INTEGER NOT NULL DEFAULT 3,
    "price" DECIMAL(14,2),
    "invoice_id" UUID,
    "void_reason" TEXT,
    "created_by_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "optical_orders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "products_sku_key" ON "products"("sku");

-- CreateIndex
CREATE INDEX "products_kind_is_active_idx" ON "products"("kind", "is_active");

-- CreateIndex
CREATE INDEX "stock_levels_site_id_quantity_idx" ON "stock_levels"("site_id", "quantity");

-- CreateIndex
CREATE INDEX "stock_levels_expires_at_idx" ON "stock_levels"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "stock_levels_product_id_site_id_lot_key" ON "stock_levels"("product_id", "site_id", "lot");

-- CreateIndex
CREATE INDEX "stock_movements_product_id_site_id_created_at_idx" ON "stock_movements"("product_id", "site_id", "created_at");

-- CreateIndex
CREATE INDEX "stock_movements_ref_type_ref_id_idx" ON "stock_movements"("ref_type", "ref_id");

-- CreateIndex
CREATE INDEX "prescriptions_person_id_issued_at_idx" ON "prescriptions"("person_id", "issued_at");

-- CreateIndex
CREATE UNIQUE INDEX "optical_orders_number_key" ON "optical_orders"("number");

-- CreateIndex
CREATE INDEX "optical_orders_status_promised_at_idx" ON "optical_orders"("status", "promised_at");

-- CreateIndex
CREATE INDEX "optical_orders_person_id_idx" ON "optical_orders"("person_id");

-- CreateIndex
CREATE INDEX "optical_orders_site_id_status_idx" ON "optical_orders"("site_id", "status");

-- AddForeignKey
ALTER TABLE "stock_levels" ADD CONSTRAINT "stock_levels_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_levels" ADD CONSTRAINT "stock_levels_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "professionals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "optical_orders" ADD CONSTRAINT "optical_orders_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "optical_orders" ADD CONSTRAINT "optical_orders_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "optical_orders" ADD CONSTRAINT "optical_orders_prescription_id_fkey" FOREIGN KEY ("prescription_id") REFERENCES "prescriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "optical_orders" ADD CONSTRAINT "optical_orders_frame_product_id_fkey" FOREIGN KEY ("frame_product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "optical_orders" ADD CONSTRAINT "optical_orders_lens_product_id_fkey" FOREIGN KEY ("lens_product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "optical_orders" ADD CONSTRAINT "optical_orders_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

