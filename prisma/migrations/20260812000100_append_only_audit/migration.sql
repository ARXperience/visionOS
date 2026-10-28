-- Tablas append-only: la auditoria y el consentimiento no se editan ni se borran.
--
-- Se hace con trigger y no con REVOKE UPDATE/DELETE porque el dueno de la
-- tabla se salta los grants, y en un compose de una sola base la aplicacion
-- suele ser tambien la duena. El trigger no lo esquiva nadie sin ser dueno,
-- que es justo el nivel de proteccion que se busca.
--
-- Ley 1581 y Res. 1995/1999: hay que poder demostrar quien consulto una ficha
-- y que ese registro no se toco despues.

CREATE OR REPLACE FUNCTION vision_append_only() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION
    'La tabla % es append-only: no admite % (registro %)',
    TG_TABLE_NAME, TG_OP, COALESCE(OLD.id::text, '?')
    USING ERRCODE = 'restrict_violation';
END;
$$;

CREATE TRIGGER audit_logs_append_only
  BEFORE UPDATE OR DELETE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION vision_append_only();
