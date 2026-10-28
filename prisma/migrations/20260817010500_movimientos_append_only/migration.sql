-- El libro de inventario no se edita ni se borra.
--
-- Un movimiento borrado es un faltante que nadie puede explicar: el saldo
-- deja de cuadrar con el libro y no hay forma de saber si fue un error de
-- digitación o alguien llevándose material quirúrgico. Se corrige con un
-- AJUSTE que deja su rastro y su motivo.
CREATE TRIGGER stock_movements_append_only
  BEFORE UPDATE OR DELETE ON stock_movements
  FOR EACH ROW EXECUTE FUNCTION vision_append_only();

-- Una fórmula óptica firmada por un profesional es dato clínico: se corrige
-- emitiendo otra, no reescribiendo la anterior.
CREATE TRIGGER prescriptions_append_only
  BEFORE UPDATE OR DELETE ON prescriptions
  FOR EACH ROW EXECUTE FUNCTION vision_append_only();

-- El saldo nunca puede quedar negativo. La aplicación ya lo valida, pero un
-- script de importación o una consulta a mano no pasan por la aplicación.
ALTER TABLE stock_levels ADD CONSTRAINT stock_levels_no_negativo CHECK (quantity >= 0);

-- Una cantidad de movimiento es siempre positiva: el signo lo pone `kind`.
-- Un menos perdido en un formulario convierte una salida en una entrada.
ALTER TABLE stock_movements ADD CONSTRAINT stock_movements_cantidad_positiva CHECK (quantity > 0);
