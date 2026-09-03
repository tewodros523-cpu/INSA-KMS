-- V22: Drop legacy obsolete column constraints on knowledge_transfer_cases

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'knowledge_transfer_cases' AND column_name = 'employee_user_id'
    ) THEN
        ALTER TABLE knowledge_transfer_cases ALTER COLUMN employee_user_id DROP NOT NULL;
        ALTER TABLE knowledge_transfer_cases DROP COLUMN IF EXISTS employee_user_id CASCADE;
    END IF;
END $$;
