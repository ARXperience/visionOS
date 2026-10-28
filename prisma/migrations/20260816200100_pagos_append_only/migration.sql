-- Un pago no se edita ni se borra.
--
-- Si un pago se registró mal, se registra otro en negativo con su motivo. Un
-- pago que se puede editar no prueba nada: el día que un paciente reclame que
-- pagó, la única defensa es que la fila no se pudo tocar.
--
-- Se hace con trigger y no con REVOKE porque el dueño de la base se salta los
-- permisos, y la aplicación se conecta con el dueño.

CREATE TRIGGER payments_append_only
  BEFORE UPDATE OR DELETE ON payments
  FOR EACH ROW EXECUTE FUNCTION vision_append_only();

-- Las glosas SÍ se actualizan (se responden), pero no se borran: una glosa
-- borrada es un cobro que la clínica no puede demostrar que peleó.
CREATE OR REPLACE FUNCTION vision_no_delete() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'La tabla % es de solo agregar y actualizar: no se borra.', TG_TABLE_NAME
    USING ERRCODE = 'restrict_violation';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER glosas_no_delete
  BEFORE DELETE ON glosas
  FOR EACH ROW EXECUTE FUNCTION vision_no_delete();
