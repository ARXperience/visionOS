-- CreateTable
CREATE TABLE "ai_prompts" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "slug" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "created_by_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_prompts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_runs" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "conversation_id" UUID,
    "person_id" UUID,
    "prompt_id" UUID,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "entrada" TEXT NOT NULL,
    "salida" TEXT,
    "tools" JSONB NOT NULL DEFAULT '[]',
    "escalado_motivo" TEXT,
    "enviado" BOOLEAN NOT NULL DEFAULT false,
    "tokens_entrada" INTEGER,
    "tokens_salida" INTEGER,
    "costo_usd" DECIMAL(10,6),
    "duracion_ms" INTEGER,
    "error" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ai_prompts_slug_is_active_idx" ON "ai_prompts"("slug", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "ai_prompts_slug_version_key" ON "ai_prompts"("slug", "version");

-- CreateIndex
CREATE INDEX "ai_runs_conversation_id_created_at_idx" ON "ai_runs"("conversation_id", "created_at");

-- CreateIndex
CREATE INDEX "ai_runs_created_at_idx" ON "ai_runs"("created_at");

-- AddForeignKey
ALTER TABLE "ai_prompts" ADD CONSTRAINT "ai_prompts_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

