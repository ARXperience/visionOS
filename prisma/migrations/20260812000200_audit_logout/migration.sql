-- El cierre de sesion es un evento auditable por si mismo: sin el no se puede
-- reconstruir cuanto tiempo estuvo abierta una sesion que consulto fichas.
ALTER TYPE "AuditAction" ADD VALUE 'LOGOUT';
