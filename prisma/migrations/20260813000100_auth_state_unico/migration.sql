-- El auth state cifrado va en una sola columna con formato
-- `iv.tag.ciphertext` en base64. Tres columnas separadas solo multiplicaban
-- las formas de escribir una y olvidar otra, y ninguna se consulta aparte.
ALTER TABLE "channels" DROP COLUMN "auth_iv";
ALTER TABLE "channels" DROP COLUMN "auth_tag";
ALTER TABLE "channels" DROP COLUMN "auth_state";
ALTER TABLE "channels" ADD COLUMN "auth_state" TEXT;
