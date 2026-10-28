-- Cirugia: programacion, lista de verificacion de la OMS e implantes.
--
-- Escrita con `migrate diff` y limpiada a mano: el diff queria ademas borrar
-- persons_name_trgm y persons_doc_idx, que existen porque los creo una
-- migracion en SQL crudo y el datamodel de Prisma no los conoce. Borrarlos
-- dejaria la busqueda de pacientes recorriendo la tabla entera.

-- CreateEnum
CREATE TYPE "SurgeryStatus" AS ENUM ('PROGRAMADA', 'EN_PREPARACION', 'EN_QUIROFANO', 'OPERADA', 'SUSPENDIDA');

-- CreateEnum
CREATE TYPE "AnesthesiaType" AS ENUM ('TOPICA', 'LOCAL', 'PERIBULBAR', 'SEDACION', 'GENERAL');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PatientEventType" ADD VALUE 'CIRUGIA_PROGRAMADA';
ALTER TYPE "PatientEventType" ADD VALUE 'CIRUGIA_REALIZADA';
ALTER TYPE "PatientEventType" ADD VALUE 'CIRUGIA_SUSPENDIDA';

-- CreateTable
CREATE TABLE "surgeries" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "appointment_id" UUID NOT NULL,
    "person_id" UUID NOT NULL,
    "site_id" UUID NOT NULL,
    "status" "SurgeryStatus" NOT NULL DEFAULT 'PROGRAMADA',
    "laterality" "Laterality" NOT NULL,
    "surgeon_id" UUID NOT NULL,
    "anesthesiologist_id" UUID,
    "team_notes" TEXT,
    "anesthesia" "AnesthesiaType" NOT NULL DEFAULT 'TOPICA',
    "consent_signed_at" TIMESTAMPTZ(3),
    "consent_file_url" TEXT,
    "entry_at" TIMESTAMPTZ(3),
    "entry_by_id" UUID,
    "entry_data" JSONB,
    "pause_at" TIMESTAMPTZ(3),
    "pause_by_id" UUID,
    "pause_data" JSONB,
    "exit_at" TIMESTAMPTZ(3),
    "exit_by_id" UUID,
    "exit_data" JSONB,
    "started_at" TIMESTAMPTZ(3),
    "ended_at" TIMESTAMPTZ(3),
    "findings" TEXT,
    "complications" TEXT,
    "suspend_reason" TEXT,
    "created_by_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "surgeries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "surgery_implants" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "surgery_id" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "brand" TEXT,
    "model" TEXT,
    "power" DECIMAL(6,2),
    "lot" TEXT,
    "serial" TEXT,
    "invima" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "surgery_implants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "surgeries_appointment_id_key" ON "surgeries"("appointment_id");

-- CreateIndex
CREATE INDEX "surgeries_site_id_status_idx" ON "surgeries"("site_id", "status");

-- CreateIndex
CREATE INDEX "surgeries_person_id_idx" ON "surgeries"("person_id");

-- CreateIndex
CREATE INDEX "surgery_implants_surgery_id_idx" ON "surgery_implants"("surgery_id");

-- CreateIndex
CREATE INDEX "surgery_implants_lot_idx" ON "surgery_implants"("lot");

-- CreateIndex
CREATE INDEX "surgery_implants_serial_idx" ON "surgery_implants"("serial");

-- AddForeignKey
ALTER TABLE "surgeries" ADD CONSTRAINT "surgeries_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "surgeries" ADD CONSTRAINT "surgeries_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "surgeries" ADD CONSTRAINT "surgeries_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "surgeries" ADD CONSTRAINT "surgeries_surgeon_id_fkey" FOREIGN KEY ("surgeon_id") REFERENCES "professionals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "surgeries" ADD CONSTRAINT "surgeries_anesthesiologist_id_fkey" FOREIGN KEY ("anesthesiologist_id") REFERENCES "professionals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "surgeries" ADD CONSTRAINT "surgeries_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "surgery_implants" ADD CONSTRAINT "surgery_implants_surgery_id_fkey" FOREIGN KEY ("surgery_id") REFERENCES "surgeries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

