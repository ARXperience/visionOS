-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- CreateEnum
CREATE TYPE "BusinessLine" AS ENUM ('CONSULTA', 'EXAMEN', 'CIRUGIA', 'OPTICA', 'EMPRESAS', 'ESTETICA');

-- CreateEnum
CREATE TYPE "RoomKind" AS ENUM ('CONSULTORIO', 'SALA_DIAGNOSTICO', 'QUIROFANO', 'SALA_PROCEDIMIENTOS', 'OPTICA');

-- CreateEnum
CREATE TYPE "EquipmentModality" AS ENUM ('OCT', 'ANGIOGRAFO', 'CAMPIMETRO', 'PENTACAM', 'ECOGRAFO', 'UBM', 'BIOMETRO', 'INTERFEROMETRO', 'PAQUIMETRO', 'MICROSCOPIO_ESPECULAR', 'PUPILOMETRO', 'ELECTROFISIOLOGIA', 'LAMPARA_HENDIDURA', 'AUTOREFRACTOMETRO', 'TOPOGRAFO', 'LASER', 'FACOEMULSIFICADOR', 'OTRO');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPERADMIN', 'ADMIN_SEDE', 'COORDINACION', 'RECEPCION', 'AGENDAMIENTO', 'CALL_CENTER', 'PROFESIONAL', 'FACTURACION', 'AUDITOR');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INVITED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'READ', 'EXPORT', 'LOGIN', 'LOGIN_FAILED', 'PRINT', 'SHARE', 'MERGE');

-- CreateTable
CREATE TABLE "sites" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "municipality_code" VARCHAR(5),
    "habilitation_code" TEXT,
    "phone" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'America/Bogota',
    "opening_hours" JSONB NOT NULL DEFAULT '{}',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "sites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rooms" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "site_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "RoomKind" NOT NULL DEFAULT 'CONSULTORIO',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipment" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "site_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "modality" "EquipmentModality" NOT NULL,
    "brand" TEXT,
    "model" TEXT,
    "serial_number" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_service_at" DATE,
    "next_service_at" DATE,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "equipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "services" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "code" TEXT NOT NULL,
    "cups_code" TEXT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "business_line" "BusinessLine" NOT NULL,
    "duration_min" INTEGER NOT NULL,
    "buffer_min" INTEGER NOT NULL DEFAULT 0,
    "requires_professional" BOOLEAN NOT NULL DEFAULT true,
    "requires_room" BOOLEAN NOT NULL DEFAULT true,
    "required_room_kind" "RoomKind",
    "required_modality" "EquipmentModality",
    "requires_referral" BOOLEAN NOT NULL DEFAULT false,
    "requires_authorization" BOOLEAN NOT NULL DEFAULT false,
    "requires_fasting" BOOLEAN NOT NULL DEFAULT false,
    "requires_dilation" BOOLEAN NOT NULL DEFAULT false,
    "requires_companion" BOOLEAN NOT NULL DEFAULT false,
    "preparation_notes" TEXT,
    "is_bilateral" BOOLEAN NOT NULL DEFAULT true,
    "produces_result_file" BOOLEAN NOT NULL DEFAULT false,
    "is_schedulable_online" BOOLEAN NOT NULL DEFAULT true,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "phone" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'RECEPCION',
    "status" "UserStatus" NOT NULL DEFAULT 'INVITED',
    "extra_permissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "cross_site_patient_read" BOOLEAN NOT NULL DEFAULT false,
    "last_login_at" TIMESTAMPTZ(3),
    "last_login_ip" TEXT,
    "mfa_enabled" BOOLEAN NOT NULL DEFAULT false,
    "mfa_secret" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_site_access" (
    "user_id" UUID NOT NULL,
    "site_id" UUID NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_site_access_pkey" PRIMARY KEY ("user_id","site_id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "token" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "device_info" TEXT,
    "ip_address" TEXT,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "is_revoked" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID,
    "action" "AuditAction" NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" UUID,
    "person_id" UUID,
    "site_id" UUID,
    "old_values" JSONB,
    "new_values" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "request_id" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sites_code_key" ON "sites"("code");

-- CreateIndex
CREATE INDEX "rooms_site_id_kind_is_active_idx" ON "rooms"("site_id", "kind", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "rooms_site_id_code_key" ON "rooms"("site_id", "code");

-- CreateIndex
CREATE INDEX "equipment_site_id_modality_is_active_idx" ON "equipment"("site_id", "modality", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "equipment_site_id_code_key" ON "equipment"("site_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "services_code_key" ON "services"("code");

-- CreateIndex
CREATE UNIQUE INDEX "services_slug_key" ON "services"("slug");

-- CreateIndex
CREATE INDEX "services_business_line_is_active_idx" ON "services"("business_line", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_status_idx" ON "users"("role", "status");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_person_id_created_at_idx" ON "audit_logs"("person_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_user_id_created_at_idx" ON "audit_logs"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_action_created_at_idx" ON "audit_logs"("action", "created_at");

-- AddForeignKey
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment" ADD CONSTRAINT "equipment_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_site_access" ADD CONSTRAINT "user_site_access_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_site_access" ADD CONSTRAINT "user_site_access_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

