-- CreateEnum
CREATE TYPE "ChannelProvider" AS ENUM ('BAILEYS', 'META_CLOUD', 'WEB', 'EMAIL', 'TELEFONO', 'PRESENCIAL');

-- CreateEnum
CREATE TYPE "ChannelStatus" AS ENUM ('DESCONECTADO', 'ESPERANDO_QR', 'CONECTANDO', 'CONECTADO', 'CERRADA_POR_WHATSAPP', 'ERROR');

-- CreateEnum
CREATE TYPE "ConversationStatus" AS ENUM ('ABIERTA', 'PENDIENTE', 'CERRADA');

-- CreateEnum
CREATE TYPE "MessageDirection" AS ENUM ('ENTRANTE', 'SALIENTE');

-- CreateEnum
CREATE TYPE "MessageAuthor" AS ENUM ('PACIENTE', 'AGENTE', 'IA', 'SISTEMA');

-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('TEXT', 'IMAGE', 'AUDIO', 'VIDEO', 'DOCUMENT', 'LOCATION', 'STICKER', 'CONTACT', 'SYSTEM');

-- CreateEnum
CREATE TYPE "MessageStatus" AS ENUM ('PENDIENTE', 'ENVIADO', 'ENTREGADO', 'LEIDO', 'FALLIDO');

-- CreateTable
CREATE TABLE "channels" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "provider" "ChannelProvider" NOT NULL,
    "name" TEXT NOT NULL,
    "phone_number" TEXT,
    "site_id" UUID,
    "status" "ChannelStatus" NOT NULL DEFAULT 'DESCONECTADO',
    "auth_state" BYTEA,
    "auth_iv" BYTEA,
    "auth_tag" BYTEA,
    "qr_code" TEXT,
    "qr_expires_at" TIMESTAMPTZ(3),
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "last_connected_at" TIMESTAMPTZ(3),
    "last_error" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "channels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "channel_id" UUID NOT NULL,
    "external_id" TEXT NOT NULL,
    "person_id" UUID,
    "assigned_to_id" UUID,
    "site_id" UUID,
    "contact_name" TEXT,
    "phone_number" TEXT,
    "status" "ConversationStatus" NOT NULL DEFAULT 'ABIERTA',
    "ai_enabled" BOOLEAN NOT NULL DEFAULT true,
    "ai_summary" TEXT,
    "ai_paused_until" TIMESTAMPTZ(3),
    "unread_count" INTEGER NOT NULL DEFAULT 0,
    "last_message_at" TIMESTAMPTZ(3),
    "last_message_text" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "conversation_id" UUID NOT NULL,
    "external_id" TEXT,
    "direction" "MessageDirection" NOT NULL,
    "author" "MessageAuthor" NOT NULL DEFAULT 'PACIENTE',
    "type" "MessageType" NOT NULL DEFAULT 'TEXT',
    "status" "MessageStatus" NOT NULL DEFAULT 'PENDIENTE',
    "body" TEXT,
    "media_url" TEXT,
    "media_mime" TEXT,
    "media_size" INTEGER,
    "file_name" TEXT,
    "is_internal" BOOLEAN NOT NULL DEFAULT false,
    "quoted_external_id" TEXT,
    "sent_by_id" UUID,
    "ai_run_id" TEXT,
    "idempotency_key" TEXT,
    "sent_at" TIMESTAMPTZ(3),
    "delivered_at" TIMESTAMPTZ(3),
    "read_at" TIMESTAMPTZ(3),
    "failed_at" TIMESTAMPTZ(3),
    "error" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "channels_provider_status_idx" ON "channels"("provider", "status");

-- CreateIndex
CREATE INDEX "conversations_status_last_message_at_idx" ON "conversations"("status", "last_message_at" DESC);

-- CreateIndex
CREATE INDEX "conversations_person_id_idx" ON "conversations"("person_id");

-- CreateIndex
CREATE INDEX "conversations_assigned_to_id_status_idx" ON "conversations"("assigned_to_id", "status");

-- CreateIndex
CREATE INDEX "conversations_site_id_status_idx" ON "conversations"("site_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "conversations_channel_id_external_id_key" ON "conversations"("channel_id", "external_id");

-- CreateIndex
CREATE UNIQUE INDEX "messages_external_id_key" ON "messages"("external_id");

-- CreateIndex
CREATE UNIQUE INDEX "messages_idempotency_key_key" ON "messages"("idempotency_key");

-- CreateIndex
CREATE INDEX "messages_conversation_id_created_at_idx" ON "messages"("conversation_id", "created_at");

-- CreateIndex
CREATE INDEX "messages_status_created_at_idx" ON "messages"("status", "created_at");

-- AddForeignKey
ALTER TABLE "channels" ADD CONSTRAINT "channels_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "persons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_assigned_to_id_fkey" FOREIGN KEY ("assigned_to_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_sent_by_id_fkey" FOREIGN KEY ("sent_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

