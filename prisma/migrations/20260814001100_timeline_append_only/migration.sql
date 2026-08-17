-- La línea de tiempo es una proyección: se reconstruye entera, no se edita
-- fila a fila. El trigger bloquea el UPDATE para que nadie "corrija" un
-- evento y deje el timeline contando algo que no pasó.
--
-- El DELETE sí se permite, y a propósito: `scripts/reconstruir-timeline.ts`
-- vacía la tabla y la regenera desde las tablas normalizadas. Esa es la
-- garantía de que la duplicación de datos sea un inconveniente y no un
-- incidente.
CREATE OR REPLACE FUNCTION vision_solo_insercion() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION
    'patient_events es una proyección: se reconstruye, no se edita (registro %)', OLD.id
    USING ERRCODE = 'restrict_violation';
END;
$$;

CREATE TRIGGER patient_events_sin_update
  BEFORE UPDATE ON patient_events
  FOR EACH ROW EXECUTE FUNCTION vision_solo_insercion();
