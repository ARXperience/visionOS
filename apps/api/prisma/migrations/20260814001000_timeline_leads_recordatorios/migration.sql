-- CreateEnum
CREATE TYPE "PatientEventType" AS ENUM ('PRIMER_CONTACTO', 'MENSAJE_ENTRANTE', 'MENSAJE_SALIENTE', 'INTERES_DETECTADO', 'COTIZACION_ENVIADA', 'LEAD_CREADO', 'LEAD_PERDIDO', 'CITA_CREADA', 'CITA_CONFIRMADA', 'CITA_REAGENDADA', 'CITA_CANCELADA', 'CHECKIN', 'ATENDIDO', 'NO_ASISTIO', 'CONSENTIMIENTO_OTORGADO', 'CONSENTIMIENTO_REVOCADO', 'NOTA_MANUAL');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NUEVO', 'CONTACTADO', 'CALIFICADO', 'COTIZADO', 'AGENDADO', 'CONVERTIDO', 'PERDIDO');

-- CreateEnum
CREATE TYPE "NotificationKind" AS ENUM ('RECORDATORIO_24H', 'RECORDATORIO_2H', 'SOLICITUD_CONFIRMACION', 'PREPARACION', 'CANCELACION', 'LISTA_ESPERA');

-- CreateEnum
CREATE TYPE "NotificationOutcome" AS ENUM ('PENDIENTE', 'ENVIADO', 'CONFIRMO', 'CANCELO', 'SIN_RESPUESTA', 'FALLIDO');

-- CreateTable
CREATE TABLE "patient_events" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "person_id" UUID NOT NULL,
    "type" "PatientEventType" NOT NULL,
    "occurred_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "site_id" UUID,
    "actor_user_id" UUID,
    "title" TEXT NOT NULL,
    "ref_type" TEXT,
    "ref_id" UUID,
    "payload" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "patient_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "person_id" UUID NOT NULL,
    "conversation_id" UUID,
    "site_id" UUID,
    "status" "LeadStatus" NOT NULL DEFAULT 'NUEVO',
    "source" "ChannelProvider" NOT NULL DEFAULT 'BAILEYS',
    "interest_service_id" UUID,
    "interest_text" TEXT,
    "quoted_amount" DECIMAL(14,2),
    "quoted_at" TIMESTAMPTZ(3),
    "assigned_to_id" UUID,
    "lost_reason" TEXT,
    "converted_at" TIMESTAMPTZ(3),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointment_notifications" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "appointment_id" UUID NOT NULL,
    "kind" "NotificationKind" NOT NULL,
    "channel" "ChannelProvider" NOT NULL DEFAULT 'BAILEYS',
    "scheduled_for" TIMESTAMPTZ(3) NOT NULL,
    "sent_at" TIMESTAMPTZ(3),
    "outcome" "NotificationOutcome" NOT NULL DEFAULT 'PENDIENTE',
    "responded_at" TIMESTAMPTZ(3),
    "message_id" UUID,
    "error" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "appointment_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "waitlist_entries" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "site_id" UUID NOT NULL,
    "person_id" UUID NOT NULL,
    "service_id" UUID NOT NULL,
    "professional_id" UUID,
    "preferred_from" TIMESTAMPTZ(3),
    "preferred_to" TIMESTAMPTZ(3),
    "priority" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "notified_at" TIMESTAMPTZ(3),
    "filled_appointment_id" UUID,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "waitlist_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "patient_events_person_id_occurred_at_idx" ON "patient_events"("person_id", "occurred_at" DESC);

-- CreateIndex
CREATE INDEX "patient_events_type_occurred_at_idx" ON "patient_events"("type", "occurred_at");

-- CreateIndex
CREATE INDEX "patient_events_ref_type_ref_id_idx" ON "patient_events"("ref_type", "ref_id");

-- CreateIndex
CREATE INDEX "leads_status_created_at_idx" ON "leads"("status", "created_at");

-- CreateIndex
CREATE INDEX "leads_person_id_idx" ON "leads"("person_id");

-- CreateIndex
CREATE INDEX "appointment_notifications_outcome_scheduled_for_idx" ON "appointment_notifications"("outcome", "scheduled_for");

-- CreateIndex
CREATE UNIQUE INDEX "appointment_notifications_appointment_id_kind_key" ON "appointment_notifications"("appointment_id", "kind");

-- CreateIndex
CREATE INDEX "waitlist_entries_site_id_service_id_is_active_priority_idx" ON "waitlist_entries"("site_id", "service_id", "is_active", "priority" DESC);

-- AddForeignKey
ALTER TABLE "patient_events" ADD CONSTRAINT "patient_events_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "persons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_events" ADD CONSTRAINT "patient_events_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_events" ADD CONSTRAINT "patient_events_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_interest_service_id_fkey" FOREIGN KEY ("interest_service_id") REFERENCES "services"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_assigned_to_id_fkey" FOREIGN KEY ("assigned_to_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment_notifications" ADD CONSTRAINT "appointment_notifications_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_filled_appointment_id_fkey" FOREIGN KEY ("filled_appointment_id") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

