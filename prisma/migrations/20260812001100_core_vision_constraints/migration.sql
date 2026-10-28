-- Lo que el esquema de Prisma no sabe expresar.

-- 1) La historia clinica es unica ENTRE PACIENTES. Un indice unico normal
--    obligaria a que todo contacto de WhatsApp tuviera numero de historia,
--    y la mayoria nunca llega a ser paciente.
CREATE UNIQUE INDEX persons_mrn_key ON persons (mrn)
  WHERE is_patient AND mrn IS NOT NULL;

-- 2) Busqueda de pacientes en el mostrador: "juan perez", "juan peres",
--    "1020...". Sin unaccent + trigram, buscar "peña" no encuentra "pena"
--    y recepcion crea un duplicado.
CREATE INDEX persons_name_trgm ON persons USING gin (display_name gin_trgm_ops);
CREATE INDEX persons_doc_idx ON persons (doc_number varchar_pattern_ops);

-- 3) Un paciente no puede fusionarse consigo mismo: seria un ciclo que
--    cuelga la resolucion de la ficha.
ALTER TABLE persons ADD CONSTRAINT persons_merge_not_self
  CHECK (merged_into_id IS NULL OR merged_into_id <> id);

-- 4) La disponibilidad tiene que ser un rango real dentro del dia.
ALTER TABLE professional_availabilities ADD CONSTRAINT pa_rango_valido CHECK (
  weekday BETWEEN 0 AND 6
  AND start_minute >= 0
  AND end_minute <= 1440
  AND end_minute > start_minute
);

-- 5) Vigencia de tarifa coherente. Una tarifa que termina antes de empezar
--    no falla al insertarse: falla el dia que alguien cotiza.
ALTER TABLE service_prices ADD CONSTRAINT sp_vigencia_valida
  CHECK (valid_to IS NULL OR valid_to >= valid_from);

ALTER TABLE coverages ADD CONSTRAINT cov_vigencia_valida
  CHECK (valid_to IS NULL OR valid_to >= valid_from);

-- 6) El consentimiento es append-only, igual que la auditoria: revocar es
--    escribir revoked_at, no borrar la fila. Ante la SIC hay que poder
--    mostrar que se autorizo, cuando y con que texto.
CREATE TRIGGER data_consents_append_only
  BEFORE DELETE ON data_consents
  FOR EACH ROW EXECUTE FUNCTION vision_append_only();

-- El UPDATE si se permite, pero solo para revocar: cambiar el texto o el
-- proposito de un consentimiento ya otorgado es falsificar la evidencia.
CREATE OR REPLACE FUNCTION data_consents_solo_revocar() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.person_id       IS DISTINCT FROM OLD.person_id
  OR NEW.purpose         IS DISTINCT FROM OLD.purpose
  OR NEW.granted         IS DISTINCT FROM OLD.granted
  OR NEW.policy_version  IS DISTINCT FROM OLD.policy_version
  OR NEW.evidence_text   IS DISTINCT FROM OLD.evidence_text
  OR NEW.granted_at      IS DISTINCT FROM OLD.granted_at THEN
    RAISE EXCEPTION
      'Un consentimiento otorgado no se edita: solo se revoca (registro %)', OLD.id
      USING ERRCODE = 'restrict_violation';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER data_consents_inmutable
  BEFORE UPDATE ON data_consents
  FOR EACH ROW EXECUTE FUNCTION data_consents_solo_revocar();
