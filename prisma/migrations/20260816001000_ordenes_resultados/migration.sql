-- CreateEnum
CREATE TYPE "ServiceOrderStatus" AS ENUM ('PENDIENTE', 'AUTORIZADA', 'AGENDADA', 'REALIZADA', 'INFORMADA', 'ANULADA', 'VENCIDA');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PatientEventType" ADD VALUE 'ORDEN_GENERADA';
ALTER TYPE "PatientEventType" ADD VALUE 'RESULTADO_CARGADO';

-- AlterTable
ALTER TABLE "appointments" ADD COLUMN     "service_order_id" UUID;

-- CreateTable
CREATE TABLE "service_orders" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "person_id" UUID NOT NULL,
    "service_id" UUID NOT NULL,
    "status" "ServiceOrderStatus" NOT NULL DEFAULT 'PENDIENTE',
    "laterality" "Laterality" NOT NULL DEFAULT 'NA',
    "origin_appointment_id" UUID,
    "ordered_by_professional_id" UUID,
    "external_order_url" TEXT,
    "authorization_number" TEXT,
    "authorized_at" TIMESTAMPTZ(3),
    "due_date" DATE,
    "indications" TEXT,
    "created_by_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "service_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_results" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "service_order_id" UUID,
    "appointment_id" UUID,
    "file_url" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "sha256" VARCHAR(64) NOT NULL,
    "performed_at" TIMESTAMPTZ(3) NOT NULL,
    "performed_by_id" UUID,
    "equipment_id" UUID,
    "is_final" BOOLEAN NOT NULL DEFAULT false,
    "report_text" TEXT,
    "uploaded_by_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_results_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "service_orders_person_id_status_idx" ON "service_orders"("person_id", "status");

-- CreateIndex
CREATE INDEX "service_orders_status_due_date_idx" ON "service_orders"("status", "due_date");

-- CreateIndex
CREATE INDEX "service_results_service_order_id_idx" ON "service_results"("service_order_id");

-- CreateIndex
CREATE INDEX "service_results_appointment_id_idx" ON "service_results"("appointment_id");

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_service_order_id_fkey" FOREIGN KEY ("service_order_id") REFERENCES "service_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_orders" ADD CONSTRAINT "service_orders_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_orders" ADD CONSTRAINT "service_orders_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_orders" ADD CONSTRAINT "service_orders_origin_appointment_id_fkey" FOREIGN KEY ("origin_appointment_id") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_orders" ADD CONSTRAINT "service_orders_ordered_by_professional_id_fkey" FOREIGN KEY ("ordered_by_professional_id") REFERENCES "professionals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_orders" ADD CONSTRAINT "service_orders_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_results" ADD CONSTRAINT "service_results_service_order_id_fkey" FOREIGN KEY ("service_order_id") REFERENCES "service_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_results" ADD CONSTRAINT "service_results_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_results" ADD CONSTRAINT "service_results_performed_by_id_fkey" FOREIGN KEY ("performed_by_id") REFERENCES "professionals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_results" ADD CONSTRAINT "service_results_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "equipment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_results" ADD CONSTRAINT "service_results_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

