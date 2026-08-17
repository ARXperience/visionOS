-- eventos_optica
--
-- Generada con scripts/migracion.mjs: lee la base, no la toca.
-- Se filtraron 3 borrados que el datamodel no conoce:
--   churn de clave foránea: audit_logs_person_id_fkey
--   DROP INDEX "persons_doc_idx";
--   DROP INDEX "persons_name_trgm";

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.

ALTER TYPE "PatientEventType" ADD VALUE 'FORMULA_OPTICA';
ALTER TYPE "PatientEventType" ADD VALUE 'GAFAS_ENTREGADAS';

