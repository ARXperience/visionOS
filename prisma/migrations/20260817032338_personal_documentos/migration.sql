-- personal_documentos
--
-- Generada con scripts/migracion.mjs: lee la base, no la toca.
-- Se filtraron 3 borrados que el datamodel no conoce:
--   churn de clave foránea: audit_logs_person_id_fkey
--   DROP INDEX "persons_doc_idx";
--   DROP INDEX "persons_name_trgm";

-- CreateEnum
CREATE TYPE "CredentialKind" AS ENUM ('TARJETA_PROFESIONAL', 'RETHUS', 'ESPECIALIZACION', 'POLIZA_RESPONSABILIDAD', 'CARNET_VACUNACION', 'CURSO_SOPORTE_VITAL', 'EXAMEN_OCUPACIONAL', 'CONTRATO', 'OTRO');

-- CreateEnum
CREATE TYPE "PersonDocumentKind" AS ENUM ('DOCUMENTO_IDENTIDAD', 'AUTORIZACION', 'ORDEN_MEDICA', 'CONSENTIMIENTO', 'HISTORIA_EXTERNA', 'SOPORTE_PAGO', 'OTRO');

-- CreateTable
CREATE TABLE "staff_credentials" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "professional_id" UUID NOT NULL,
    "kind" "CredentialKind" NOT NULL,
    "number" TEXT,
    "issued_by" TEXT,
    "issued_at" DATE,
    "expires_at" DATE,
    "file_url" TEXT,
    "notes" TEXT,
    "created_by_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "staff_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "person_documents" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "person_id" UUID NOT NULL,
    "kind" "PersonDocumentKind" NOT NULL,
    "title" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "sha256" VARCHAR(64) NOT NULL,
    "expires_at" DATE,
    "archived_at" TIMESTAMPTZ(3),
    "archived_reason" TEXT,
    "uploaded_by_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "person_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "staff_credentials_professional_id_idx" ON "staff_credentials"("professional_id");

-- CreateIndex
CREATE INDEX "staff_credentials_expires_at_idx" ON "staff_credentials"("expires_at");

-- CreateIndex
CREATE INDEX "person_documents_person_id_kind_idx" ON "person_documents"("person_id", "kind");

-- AddForeignKey
ALTER TABLE "staff_credentials" ADD CONSTRAINT "staff_credentials_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "professionals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_credentials" ADD CONSTRAINT "staff_credentials_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "person_documents" ADD CONSTRAINT "person_documents_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "person_documents" ADD CONSTRAINT "person_documents_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

