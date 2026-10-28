-- Los resultados no se borran ni se reescriben: se sube otra versión.
--
-- Un informe diagnóstico que se puede editar deja de ser prueba de nada. El
-- `sha256` permite demostrar que el archivo no cambió; este trigger impide
-- que cambie la fila que lo describe.
CREATE TRIGGER service_results_append_only
  BEFORE DELETE ON service_results
  FOR EACH ROW EXECUTE FUNCTION vision_append_only();

-- Se permite marcar un preliminar como definitivo —`is_final`—, pero no
-- reescribir de qué archivo se habla, su hash, cuándo se realizó ni el
-- informe transcrito.
CREATE OR REPLACE FUNCTION service_results_solo_finalizar() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.file_url     IS DISTINCT FROM OLD.file_url
  OR NEW.sha256       IS DISTINCT FROM OLD.sha256
  OR NEW.performed_at IS DISTINCT FROM OLD.performed_at
  OR NEW.report_text  IS DISTINCT FROM OLD.report_text THEN
    RAISE EXCEPTION
      'Un resultado no se edita: suba otra versión (registro %)', OLD.id
      USING ERRCODE = 'restrict_violation';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER service_results_inmutable
  BEFORE UPDATE ON service_results
  FOR EACH ROW EXECUTE FUNCTION service_results_solo_finalizar();
