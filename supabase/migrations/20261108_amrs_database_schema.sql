-- =====================================================================
-- AMRS Automated Model Recovery System - Supabase Relational Schema
-- Migration: 20261108_amrs_database_schema.sql
-- =====================================================================

-- Ensure uuid-ossp extension is available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ---------------------------------------------------------------------
-- 1. Model Uploads Table
-- Stores uploaded model checkpoints, architecture, checksums, and validation status.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.model_uploads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    architecture TEXT NOT NULL,
    checkpoint_path TEXT NOT NULL,
    size_bytes BIGINT NOT NULL DEFAULT 0,
    sha256 TEXT,
    validation_status TEXT NOT NULL DEFAULT 'valid' CHECK (validation_status IN ('valid', 'invalid', 'pending')),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ---------------------------------------------------------------------
-- 2. Dataset Uploads Table
-- Stores validation/fine-tuning datasets, formats, sample counts, and validation status.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.dataset_uploads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    format TEXT NOT NULL DEFAULT 'npz',
    size_bytes BIGINT NOT NULL DEFAULT 0,
    num_samples INTEGER NOT NULL DEFAULT 0,
    num_classes INTEGER NOT NULL DEFAULT 0,
    validation_status TEXT NOT NULL DEFAULT 'valid' CHECK (validation_status IN ('valid', 'invalid', 'pending')),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ---------------------------------------------------------------------
-- 3. Recovery Runs Table
-- Tracks every diagnosis and recovery execution, progress stages, and timestamps.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.recovery_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    model_id UUID REFERENCES public.model_uploads(id) ON DELETE SET NULL,
    dataset_id UUID REFERENCES public.dataset_uploads(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'succeeded', 'failed', 'cancelled')),
    progress_stage TEXT NOT NULL DEFAULT 'idle',
    progress_pct REAL NOT NULL DEFAULT 0.0,
    detected_issues JSONB NOT NULL DEFAULT '[]'::jsonb,
    execution_params JSONB NOT NULL DEFAULT '{}'::jsonb,
    error_message TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ---------------------------------------------------------------------
-- 4. Recovery Results Table
-- Stores deep statistical outcomes, baseline vs recovered metrics, gate verdicts.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.recovery_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID NOT NULL REFERENCES public.recovery_runs(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    verdict TEXT NOT NULL CHECK (verdict IN ('accepted', 'rolled_back', 'healthy_no_action', 'error')),
    primary_diagnosis TEXT NOT NULL DEFAULT 'None',
    confidence REAL NOT NULL DEFAULT 0.0,
    original_accuracy REAL NOT NULL DEFAULT 0.0,
    recovered_accuracy REAL NOT NULL DEFAULT 0.0,
    delta_accuracy REAL NOT NULL DEFAULT 0.0,
    original_ece REAL NOT NULL DEFAULT 0.0,
    recovered_ece REAL NOT NULL DEFAULT 0.0,
    delta_ece REAL NOT NULL DEFAULT 0.0,
    retention_rate REAL NOT NULL DEFAULT 1.0,
    ci_low REAL NOT NULL DEFAULT 0.0,
    ci_high REAL NOT NULL DEFAULT 0.0,
    compute_units REAL NOT NULL DEFAULT 0.0,
    duration_s REAL NOT NULL DEFAULT 0.0,
    applied_strategy TEXT,
    candidate_details JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ---------------------------------------------------------------------
-- 5. Run Artifacts Table
-- Tracks checkpoints, reports, logs, and evaluation figures stored in Supabase Storage.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.run_artifacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID NOT NULL REFERENCES public.recovery_runs(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    artifact_type TEXT NOT NULL CHECK (artifact_type IN ('checkpoint', 'report', 'log', 'chart', 'metrics', 'other')),
    storage_path TEXT NOT NULL,
    download_url TEXT,
    size_bytes BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ---------------------------------------------------------------------
-- 6. History Table / Audit View
-- Provides a denormalized historical view tracing multiple recovery attempts per model.
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW public.history AS
SELECT
    r.id AS id,
    r.id AS run_id,
    r.user_id,
    r.model_id,
    COALESCE(m.name, 'Direct Checkpoint') AS model_name,
    COALESCE(m.architecture, 'resnet18') AS architecture,
    r.dataset_id,
    COALESCE(d.name, 'Default Test Set') AS dataset_name,
    r.status,
    COALESCE(res.verdict, 'pending') AS verdict,
    COALESCE(res.primary_diagnosis, 'Pending evaluation') AS primary_diagnosis,
    COALESCE(res.applied_strategy, 'None') AS applied_strategy,
    COALESCE(res.original_accuracy, 0.0) AS original_accuracy,
    COALESCE(res.recovered_accuracy, 0.0) AS recovered_accuracy,
    COALESCE(res.delta_accuracy, 0.0) AS delta_accuracy,
    COALESCE(res.original_ece, 0.0) AS original_ece,
    COALESCE(res.recovered_ece, 0.0) AS recovered_ece,
    COALESCE(res.compute_units, 0.0) AS compute_units,
    COALESCE(res.duration_s, 0.0) AS duration_s,
    r.started_at,
    r.completed_at,
    r.created_at
FROM public.recovery_runs r
LEFT JOIN public.model_uploads m ON r.model_id = m.id
LEFT JOIN public.dataset_uploads d ON r.dataset_id = d.id
LEFT JOIN public.recovery_results res ON r.id = res.run_id;

-- ---------------------------------------------------------------------
-- 7. High-Performance Indexes
-- ---------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_model_uploads_user ON public.model_uploads(user_id);
CREATE INDEX IF NOT EXISTS idx_dataset_uploads_user ON public.dataset_uploads(user_id);
CREATE INDEX IF NOT EXISTS idx_recovery_runs_user ON public.recovery_runs(user_id);
CREATE INDEX IF NOT EXISTS idx_recovery_runs_model ON public.recovery_runs(model_id);
CREATE INDEX IF NOT EXISTS idx_recovery_runs_created ON public.recovery_runs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_recovery_runs_status ON public.recovery_runs(status);
CREATE INDEX IF NOT EXISTS idx_recovery_results_run ON public.recovery_results(run_id);
CREATE INDEX IF NOT EXISTS idx_recovery_results_user ON public.recovery_results(user_id);
CREATE INDEX IF NOT EXISTS idx_recovery_results_verdict ON public.recovery_results(verdict);
CREATE INDEX IF NOT EXISTS idx_run_artifacts_run ON public.run_artifacts(run_id);
CREATE INDEX IF NOT EXISTS idx_run_artifacts_user ON public.run_artifacts(user_id);

-- ---------------------------------------------------------------------
-- 8. Row Level Security (RLS) & Isolation Policies
-- ---------------------------------------------------------------------
ALTER TABLE public.model_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dataset_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recovery_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recovery_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.run_artifacts ENABLE ROW LEVEL SECURITY;

-- Model Uploads RLS
DROP POLICY IF EXISTS "Users can view own models" ON public.model_uploads;
CREATE POLICY "Users can view own models" ON public.model_uploads
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own models" ON public.model_uploads;
CREATE POLICY "Users can insert own models" ON public.model_uploads
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own models" ON public.model_uploads;
CREATE POLICY "Users can update own models" ON public.model_uploads
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own models" ON public.model_uploads;
CREATE POLICY "Users can delete own models" ON public.model_uploads
    FOR DELETE USING (auth.uid() = user_id);

-- Dataset Uploads RLS
DROP POLICY IF EXISTS "Users can view own datasets" ON public.dataset_uploads;
CREATE POLICY "Users can view own datasets" ON public.dataset_uploads
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own datasets" ON public.dataset_uploads;
CREATE POLICY "Users can insert own datasets" ON public.dataset_uploads
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own datasets" ON public.dataset_uploads;
CREATE POLICY "Users can update own datasets" ON public.dataset_uploads
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own datasets" ON public.dataset_uploads;
CREATE POLICY "Users can delete own datasets" ON public.dataset_uploads
    FOR DELETE USING (auth.uid() = user_id);

-- Recovery Runs RLS
DROP POLICY IF EXISTS "Users can view own runs" ON public.recovery_runs;
CREATE POLICY "Users can view own runs" ON public.recovery_runs
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own runs" ON public.recovery_runs;
CREATE POLICY "Users can insert own runs" ON public.recovery_runs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own runs" ON public.recovery_runs;
CREATE POLICY "Users can update own runs" ON public.recovery_runs
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own runs" ON public.recovery_runs;
CREATE POLICY "Users can delete own runs" ON public.recovery_runs
    FOR DELETE USING (auth.uid() = user_id);

-- Recovery Results RLS
DROP POLICY IF EXISTS "Users can view own results" ON public.recovery_results;
CREATE POLICY "Users can view own results" ON public.recovery_results
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own results" ON public.recovery_results;
CREATE POLICY "Users can insert own results" ON public.recovery_results
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Run Artifacts RLS
DROP POLICY IF EXISTS "Users can view own artifacts" ON public.run_artifacts;
CREATE POLICY "Users can view own artifacts" ON public.run_artifacts
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own artifacts" ON public.run_artifacts;
CREATE POLICY "Users can insert own artifacts" ON public.run_artifacts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

