-- Revocar los refresh tokens al cambiar una contraseña no alcanza: el access
-- token ya emitido vive hasta 15 minutos más. Cuando la clave se cambia
-- porque se filtró, esos 15 minutos son exactamente los que no se pueden
-- regalar. La estrategia JWT compara el `iat` del token contra esta marca.
ALTER TABLE "users" ADD COLUMN "password_changed_at" TIMESTAMPTZ(3);
