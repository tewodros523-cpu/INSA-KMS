-- V33: Monthly Top Contributors Snapshot Table
-- Stores the evaluated Top 3 contributors per calendar month so the rankings remain pinned for that month.

CREATE TABLE IF NOT EXISTS monthly_top_contributors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    year_month VARCHAR(7) NOT NULL, -- e.g. '2026-09'
    rank INT NOT NULL,              -- 1, 2, 3
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    documents_count BIGINT NOT NULL DEFAULT 0,
    blogs_count BIGINT NOT NULL DEFAULT 0,
    articles_count BIGINT NOT NULL DEFAULT 0,
    total_contributions BIGINT NOT NULL DEFAULT 0,
    evaluated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT uq_monthly_rank UNIQUE (year_month, rank)
);

CREATE INDEX IF NOT EXISTS idx_monthly_contributors_ym ON monthly_top_contributors(year_month);
