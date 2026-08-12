-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('CC', 'TI', 'CE', 'PA', 'RC', 'NIT', 'MS', 'AS', 'PE', 'PT', 'CN', 'SC', 'DE');

-- CreateEnum
CREATE TYPE "Sex" AS ENUM ('M', 'F', 'I');

-- CreateEnum
CREATE TYPE "Zone" AS ENUM ('U', 'R');

-- CreateEnum
CREATE TYPE "PayerType" AS ENUM ('EPS', 'PREPAGADA', 'POLIZA', 'ARL', 'SOAT', 'EMPRESA', 'PARTICULAR');

-- CreateEnum
CREATE TYPE "Regime" AS ENUM ('CONTRIBUTIVO', 'SUBSIDIADO', 'ESPECIAL', 'EXCEPCION', 'PARTICULAR');

-- CreateEnum
CREATE TYPE "ProfessionalType" AS ENUM ('OFTALMOLOGO', 'OPTOMETRA', 'ORTOPTISTA', 'ANESTESIOLOGO', 'ENFERMERIA', 'ESTETICA', 'OTRO');

-- CreateEnum
CREATE TYPE "ConsentPurpose" AS ENUM ('TRATAMIENTO_DATOS', 'COMUNICACIONES_COMERCIALES', 'HISTORIA_CLINICA', 'IMAGENES', 'TELECONSULTA');

-- CreateTable
CREATE TABLE "persons" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "docType" "DocumentType",
    "doc_number" TEXT,
    "first_name" TEXT NOT NULL,
    "second_name" TEXT,
    "first_surname" TEXT,
    "second_surname" TEXT,
    "display_name" TEXT NOT NULL,
    "birth_date" DATE,
    "sex" "Sex",
    "phone" TEXT,
    "phone_alt" TEXT,
    "email" TEXT,
    "country_code" VARCHAR(3) NOT NULL DEFAULT '170',
    "department_code" VARCHAR(2),
    "municipality_code" VARCHAR(5),
    "zone" "Zone",
    "address_line" TEXT,
    "is_patient" BOOLEAN NOT NULL DEFAULT false,
    "patient_since" TIMESTAMPTZ(3),
    "mrn" TEXT,
    "occupation" TEXT,
    "emergency_contact_name" TEXT,
    "emergency_contact_phone" TEXT,
    "emergency_contact_rel" TEXT,
    "merged_into_id" UUID,
    "notes" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "persons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payers" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "type" "PayerType" NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nit" TEXT,
    "dv" VARCHAR(1),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "requires_authorization" BOOLEAN NOT NULL DEFAULT false,
    "contact_email" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "payers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coverages" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "person_id" UUID NOT NULL,
    "payer_id" UUID NOT NULL,
    "regime" "Regime" NOT NULL DEFAULT 'PARTICULAR',
    "plan_name" TEXT,
    "policy_number" TEXT,
    "affiliate_type" TEXT,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "valid_from" DATE,
    "valid_to" DATE,
    "verified_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "coverages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "data_consents" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "person_id" UUID NOT NULL,
    "purpose" "ConsentPurpose" NOT NULL,
    "granted" BOOLEAN NOT NULL,
    "policy_version" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "evidence_url" TEXT,
    "evidence_text" TEXT,
    "ip_address" TEXT,
    "captured_by_id" UUID,
    "granted_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMPTZ(3),

    CONSTRAINT "data_consents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "professionals" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID,
    "doc_type" "DocumentType" NOT NULL DEFAULT 'CC',
    "doc_number" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "type" "ProfessionalType" NOT NULL,
    "license_number" TEXT,
    "specialties" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "color" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "professionals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "professional_sites" (
    "professional_id" UUID NOT NULL,
    "site_id" UUID NOT NULL,

    CONSTRAINT "professional_sites_pkey" PRIMARY KEY ("professional_id","site_id")
);

-- CreateTable
CREATE TABLE "professional_availabilities" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "professional_id" UUID NOT NULL,
    "site_id" UUID NOT NULL,
    "weekday" SMALLINT NOT NULL,
    "start_minute" INTEGER NOT NULL,
    "end_minute" INTEGER NOT NULL,
    "service_ids" UUID[] DEFAULT ARRAY[]::UUID[],
    "valid_from" DATE,
    "valid_to" DATE,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "professional_availabilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_professionals" (
    "service_id" UUID NOT NULL,
    "professional_id" UUID NOT NULL,
    "duration_min" INTEGER,

    CONSTRAINT "service_professionals_pkey" PRIMARY KEY ("service_id","professional_id")
);

-- CreateTable
CREATE TABLE "service_prices" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "service_id" UUID NOT NULL,
    "payer_id" UUID,
    "site_id" UUID,
    "price" DECIMAL(14,2) NOT NULL,
    "copay" DECIMAL(14,2),
    "currency" VARCHAR(3) NOT NULL DEFAULT 'COP',
    "tariff_book" TEXT,
    "valid_from" DATE NOT NULL,
    "valid_to" DATE,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "holidays" (
    "date" DATE NOT NULL,
    "name" TEXT NOT NULL,
    "is_national" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "holidays_pkey" PRIMARY KEY ("date")
);

-- CreateIndex
CREATE INDEX "persons_display_name_idx" ON "persons"("display_name");

-- CreateIndex
CREATE INDEX "persons_phone_idx" ON "persons"("phone");

-- CreateIndex
CREATE INDEX "persons_is_patient_created_at_idx" ON "persons"("is_patient", "created_at");

-- CreateIndex
CREATE INDEX "persons_merged_into_id_idx" ON "persons"("merged_into_id");

-- CreateIndex
CREATE UNIQUE INDEX "persons_docType_doc_number_key" ON "persons"("docType", "doc_number");

-- CreateIndex
CREATE UNIQUE INDEX "payers_code_key" ON "payers"("code");

-- CreateIndex
CREATE INDEX "payers_type_is_active_idx" ON "payers"("type", "is_active");

-- CreateIndex
CREATE INDEX "coverages_person_id_is_primary_idx" ON "coverages"("person_id", "is_primary");

-- CreateIndex
CREATE INDEX "coverages_payer_id_idx" ON "coverages"("payer_id");

-- CreateIndex
CREATE INDEX "data_consents_person_id_purpose_granted_at_idx" ON "data_consents"("person_id", "purpose", "granted_at");

-- CreateIndex
CREATE UNIQUE INDEX "professionals_user_id_key" ON "professionals"("user_id");

-- CreateIndex
CREATE INDEX "professionals_is_active_type_idx" ON "professionals"("is_active", "type");

-- CreateIndex
CREATE UNIQUE INDEX "professionals_doc_type_doc_number_key" ON "professionals"("doc_type", "doc_number");

-- CreateIndex
CREATE INDEX "professional_availabilities_professional_id_weekday_idx" ON "professional_availabilities"("professional_id", "weekday");

-- CreateIndex
CREATE INDEX "professional_availabilities_site_id_weekday_idx" ON "professional_availabilities"("site_id", "weekday");

-- CreateIndex
CREATE INDEX "service_prices_service_id_payer_id_valid_from_idx" ON "service_prices"("service_id", "payer_id", "valid_from");

-- AddForeignKey
ALTER TABLE "persons" ADD CONSTRAINT "persons_merged_into_id_fkey" FOREIGN KEY ("merged_into_id") REFERENCES "persons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coverages" ADD CONSTRAINT "coverages_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "persons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coverages" ADD CONSTRAINT "coverages_payer_id_fkey" FOREIGN KEY ("payer_id") REFERENCES "payers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_consents" ADD CONSTRAINT "data_consents_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "persons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_consents" ADD CONSTRAINT "data_consents_captured_by_id_fkey" FOREIGN KEY ("captured_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professionals" ADD CONSTRAINT "professionals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professional_sites" ADD CONSTRAINT "professional_sites_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "professionals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professional_sites" ADD CONSTRAINT "professional_sites_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professional_availabilities" ADD CONSTRAINT "professional_availabilities_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "professionals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professional_availabilities" ADD CONSTRAINT "professional_availabilities_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_professionals" ADD CONSTRAINT "service_professionals_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_professionals" ADD CONSTRAINT "service_professionals_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "professionals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_prices" ADD CONSTRAINT "service_prices_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_prices" ADD CONSTRAINT "service_prices_payer_id_fkey" FOREIGN KEY ("payer_id") REFERENCES "payers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

