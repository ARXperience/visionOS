-- Un solo prompt activo por propósito.
--
-- Sin esto, dos versiones activas a la vez producen un asistente que
-- responde distinto según el orden que devuelva la consulta, y eso es
-- imposible de depurar: el mismo paciente recibe dos comportamientos y
-- nadie sabe cuál está corriendo.
CREATE UNIQUE INDEX ai_prompts_un_activo
  ON ai_prompts (slug)
  WHERE is_active;

-- El contenido de una versión publicada no se edita: se publica otra. Si se
-- pudiera reescribir, `ai_runs.promptId` apuntaría a un texto que ya no es
-- el que produjo esa respuesta, y la trazabilidad dejaría de servir justo
-- cuando hace falta.
CREATE OR REPLACE FUNCTION ai_prompts_solo_activar() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.content IS DISTINCT FROM OLD.content
  OR NEW.slug    IS DISTINCT FROM OLD.slug
  OR NEW.version IS DISTINCT FROM OLD.version THEN
    RAISE EXCEPTION
      'Un prompt publicado no se edita: publique otra versión (registro %)', OLD.id
      USING ERRCODE = 'restrict_violation';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER ai_prompts_inmutable
  BEFORE UPDATE ON ai_prompts
  FOR EACH ROW EXECUTE FUNCTION ai_prompts_solo_activar();
