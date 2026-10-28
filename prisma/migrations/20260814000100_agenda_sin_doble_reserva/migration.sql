-- La agenda no se puede sobrevender. Lo impone el motor, no la aplicación.

-- 1) Exactamente un recurso por reserva. Sin esto, el COALESCE del EXCLUDE
--    de abajo compararía la primera columna no nula y dejaría pasar
--    solapamientos silenciosos.
ALTER TABLE resource_bookings ADD CONSTRAINT rb_un_recurso CHECK (
  (professional_id IS NOT NULL)::int
+ (room_id         IS NOT NULL)::int
+ (equipment_id    IS NOT NULL)::int = 1
);

-- 2) Y que el tipo declarado coincida con la columna que se llenó: si no,
--    una reserva de sala podría decir que es de profesional y los filtros
--    de la agenda mentirían.
ALTER TABLE resource_bookings ADD CONSTRAINT rb_tipo_coherente CHECK (
  (kind = 'PROFESSIONAL' AND professional_id IS NOT NULL) OR
  (kind = 'ROOM'         AND room_id         IS NOT NULL) OR
  (kind = 'EQUIPMENT'    AND equipment_id    IS NOT NULL)
);

ALTER TABLE resource_bookings ADD CONSTRAINT rb_rango_valido CHECK (ends_at > starts_at);
ALTER TABLE appointments      ADD CONSTRAINT cita_rango_valido CHECK (ends_at > starts_at);

-- 3) ⚑ NO HAY DOBLE RESERVA.
--
--    COALESCE funciona porque el CHECK garantiza que solo una de las tres
--    columnas es no nula, y los uuid v4 son únicos entre las tres tablas:
--    dos recursos distintos nunca comparten identificador.
--
--    El índice es PARCIAL sobre `active`: cancelar una cita pone active en
--    false dentro de la misma transacción y el cupo queda libre, sin borrar
--    la fila ni perder que estuvo reservado.
--
--    '[)' — inicio incluido, fin excluido. Una cita de 9:00 a 9:30 y otra de
--    9:30 a 10:00 NO se solapan, que es lo que espera cualquiera que mire
--    una agenda.
ALTER TABLE resource_bookings ADD CONSTRAINT rb_sin_solapamiento EXCLUDE USING gist (
  COALESCE(professional_id, room_id, equipment_id) WITH =,
  tstzrange(starts_at, ends_at, '[)')              WITH &&
) WHERE (active);

-- 4) El mismo paciente no puede tener dos veces el mismo servicio a la misma
--    hora. Pasa de verdad: el paciente escribe por WhatsApp y a la vez llama
--    por teléfono, y dos personas distintas lo agendan.
CREATE UNIQUE INDEX citas_sin_duplicar
  ON appointments (person_id, service_id, starts_at)
  WHERE status NOT IN ('CANCELADA', 'NO_ASISTIO');

-- 5) El historial de estados no se reescribe: es la fuente de los
--    indicadores de oportunidad y de no-show.
CREATE TRIGGER appointment_status_events_append_only
  BEFORE UPDATE OR DELETE ON appointment_status_events
  FOR EACH ROW EXECUTE FUNCTION vision_append_only();
