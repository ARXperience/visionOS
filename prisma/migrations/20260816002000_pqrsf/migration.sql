-- CreateEnum
CREATE TYPE "PqrsfTipo" AS ENUM ('PETICION', 'QUEJA', 'RECLAMO', 'SUGERENCIA', 'FELICITACION');

-- CreateEnum
CREATE TYPE "PqrsfEstado" AS ENUM ('RADICADA', 'EN_GESTION', 'RESPONDIDA', 'CERRADA');

-- CreateTable
CREATE TABLE "pqrsf" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "radicado" TEXT NOT NULL,
    "tipo" "PqrsfTipo" NOT NULL,
    "estado" "PqrsfEstado" NOT NULL DEFAULT 'RADICADA',
    "person_id" UUID,
    "nombre" TEXT,
    "contacto" TEXT,
    "site_id" UUID,
    "service_id" UUID,
    "asunto" TEXT NOT NULL,
    "detalle" TEXT NOT NULL,
    "due_date" DATE NOT NULL,
    "assigned_to_id" UUID,
    "respuesta" TEXT,
    "responded_at" TIMESTAMPTZ(3),
    "closed_at" TIMESTAMPTZ(3),
    "satisfaccion" SMALLINT,
    "created_by_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "pqrsf_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pqrsf_radicado_key" ON "pqrsf"("radicado");

-- CreateIndex
CREATE INDEX "pqrsf_estado_due_date_idx" ON "pqrsf"("estado", "due_date");

-- CreateIndex
CREATE INDEX "pqrsf_person_id_idx" ON "pqrsf"("person_id");

-- AddForeignKey
ALTER TABLE "pqrsf" ADD CONSTRAINT "pqrsf_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "persons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pqrsf" ADD CONSTRAINT "pqrsf_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pqrsf" ADD CONSTRAINT "pqrsf_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pqrsf" ADD CONSTRAINT "pqrsf_assigned_to_id_fkey" FOREIGN KEY ("assigned_to_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pqrsf" ADD CONSTRAINT "pqrsf_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

