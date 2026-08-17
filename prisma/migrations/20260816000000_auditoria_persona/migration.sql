-- Clave foránea de audit_logs.person_id.
--
-- La columna ya existía desnormalizada para poder responder "quién consultó
-- a este paciente" en una sola consulta. La relación permite además traer el
-- nombre sin una segunda vuelta, y garantiza que el id apunte a alguien.
--
-- Es segura porque una persona NUNCA se borra físicamente: el trigger de
-- data_consents lo impide y el borrado del sistema es lógico.
--
-- ON DELETE RESTRICT y no SET NULL: poner el paciente en null sería
-- exactamente perder el dato que el registro existe para conservar.
ALTER TABLE "audit_logs"
  ADD CONSTRAINT "audit_logs_person_id_fkey"
  FOREIGN KEY ("person_id") REFERENCES "persons"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
