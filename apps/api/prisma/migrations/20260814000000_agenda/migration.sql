-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('PROGRAMADA', 'CONFIRMADA', 'LLEGO', 'EN_ADMISION', 'EN_ESPERA', 'EN_ATENCION', 'EN_PROCEDIMIENTO', 'PARA_FACTURAR', 'FINALIZADA', 'NO_ASISTIO', 'CANCELADA');

-- CreateEnum
CREATE TYPE "CancelActor" AS ENUM ('PACIENTE', 'CLINICA', 'PROFESIONAL', 'ASEGURADOR', 'SISTEMA');

-- CreateEnum
CREATE TYPE "ResourceKind" AS ENUM ('PROFESSIONAL', 'ROOM', 'EQUIPMENT');

-- CreateEnum
CREATE TYPE "Laterality" AS ENUM ('OD', 'OI', 'AO', 'NA');

-- CreateTable
CREATE TABLE "appointments" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "public_code" TEXT NOT NULL,
    "site_id" UUID NOT NULL,
    "person_id" UUID NOT NULL,
    "service_id" UUID NOT NULL,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'PROGRAMADA',
    "starts_at" TIMESTAMPTZ(3) NOT NULL,
    "ends_at" TIMESTAMPTZ(3) NOT NULL,
    "laterality" "Laterality" NOT NULL DEFAULT 'NA',
    "payer_id" UUID,
    "coverage_id" UUID,
    "authorization_number" TEXT,
    "referral_file_url" TEXT,
    "quoted_price" DECIMAL(14,2),
    "created_via" "ChannelProvider" NOT NULL DEFAULT 'PRESENCIAL',
    "created_by_id" UUID,
    "conversation_id" UUID,
    "confirmed_at" TIMESTAMPTZ(3),
    "arrived_at" TIMESTAMPTZ(3),
    "attended_at" TIMESTAMPTZ(3),
    "completed_at" TIMESTAMPTZ(3),
    "cancelled_at" TIMESTAMPTZ(3),
    "cancel_actor" "CancelActor",
    "cancel_reason" TEXT,
    "rescheduled_from_id" UUID,
    "notes" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resource_bookings" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "appointment_id" UUID,
    "site_id" UUID NOT NULL,
    "professional_id" UUID,
    "room_id" UUID,
    "equipment_id" UUID,
    "kind" "ResourceKind" NOT NULL,
    "starts_at" TIMESTAMPTZ(3) NOT NULL,
    "ends_at" TIMESTAMPTZ(3) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "block_reason" TEXT,
    "created_by_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resource_bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointment_status_events" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "appointment_id" UUID NOT NULL,
    "from_status" "AppointmentStatus",
    "to_status" "AppointmentStatus" NOT NULL,
    "reason" TEXT,
    "by_user_id" UUID,
    "by_system" TEXT,
    "occurred_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "appointment_status_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "appointments_public_code_key" ON "appointments"("public_code");

-- CreateIndex
CREATE UNIQUE INDEX "appointments_rescheduled_from_id_key" ON "appointments"("rescheduled_from_id");

-- CreateIndex
CREATE INDEX "appointments_site_id_starts_at_idx" ON "appointments"("site_id", "starts_at");

-- CreateIndex
CREATE INDEX "appointments_site_id_status_starts_at_idx" ON "appointments"("site_id", "status", "starts_at");

-- CreateIndex
CREATE INDEX "appointments_person_id_starts_at_idx" ON "appointments"("person_id", "starts_at" DESC);

-- CreateIndex
CREATE INDEX "appointments_status_starts_at_idx" ON "appointments"("status", "starts_at");

-- CreateIndex
CREATE INDEX "resource_bookings_appointment_id_idx" ON "resource_bookings"("appointment_id");

-- CreateIndex
CREATE INDEX "resource_bookings_professional_id_starts_at_idx" ON "resource_bookings"("professional_id", "starts_at");

-- CreateIndex
CREATE INDEX "resource_bookings_room_id_starts_at_idx" ON "resource_bookings"("room_id", "starts_at");

-- CreateIndex
CREATE INDEX "resource_bookings_equipment_id_starts_at_idx" ON "resource_bookings"("equipment_id", "starts_at");

-- CreateIndex
CREATE INDEX "resource_bookings_site_id_starts_at_idx" ON "resource_bookings"("site_id", "starts_at");

-- CreateIndex
CREATE INDEX "appointment_status_events_appointment_id_occurred_at_idx" ON "appointment_status_events"("appointment_id", "occurred_at");

-- CreateIndex
CREATE INDEX "appointment_status_events_to_status_occurred_at_idx" ON "appointment_status_events"("to_status", "occurred_at");

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_payer_id_fkey" FOREIGN KEY ("payer_id") REFERENCES "payers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_coverage_id_fkey" FOREIGN KEY ("coverage_id") REFERENCES "coverages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_rescheduled_from_id_fkey" FOREIGN KEY ("rescheduled_from_id") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_bookings" ADD CONSTRAINT "resource_bookings_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_bookings" ADD CONSTRAINT "resource_bookings_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_bookings" ADD CONSTRAINT "resource_bookings_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "professionals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_bookings" ADD CONSTRAINT "resource_bookings_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_bookings" ADD CONSTRAINT "resource_bookings_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "equipment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_bookings" ADD CONSTRAINT "resource_bookings_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment_status_events" ADD CONSTRAINT "appointment_status_events_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment_status_events" ADD CONSTRAINT "appointment_status_events_by_user_id_fkey" FOREIGN KEY ("by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

