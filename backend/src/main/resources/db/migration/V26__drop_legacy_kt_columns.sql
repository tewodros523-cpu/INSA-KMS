-- V23: Drop legacy obsolete column constraints on knowledge_transfer_checklists and related tables

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'knowledge_transfer_checklists' AND column_name = 'item_title'
    ) THEN
        ALTER TABLE knowledge_transfer_checklists ALTER COLUMN item_title DROP NOT NULL;
        ALTER TABLE knowledge_transfer_checklists DROP COLUMN IF EXISTS item_title CASCADE;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'knowledge_transfer_submissions' AND column_name = 'submission_title'
    ) THEN
        ALTER TABLE knowledge_transfer_submissions ALTER COLUMN submission_title DROP NOT NULL;
        ALTER TABLE knowledge_transfer_submissions DROP COLUMN IF EXISTS submission_title CASCADE;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'knowledge_transfer_sessions' AND column_name = 'session_title'
    ) THEN
        ALTER TABLE knowledge_transfer_sessions ALTER COLUMN session_title DROP NOT NULL;
        ALTER TABLE knowledge_transfer_sessions DROP COLUMN IF EXISTS session_title CASCADE;
    END IF;
END $$;
