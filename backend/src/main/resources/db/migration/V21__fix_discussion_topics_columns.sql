-- Migration V21: Enforce text column types for discussion_topics table
-- Prevents PostgreSQL lower(bytea) function mismatch errors.

DO $$
BEGIN
    -- 1. Fix discussion_topics.title column if bytea
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'discussion_topics' AND column_name = 'title' AND data_type = 'bytea'
    ) THEN
        ALTER TABLE discussion_topics ALTER COLUMN title TYPE VARCHAR(255) USING convert_from(title, 'UTF8');
    END IF;

    -- 2. Fix discussion_topics.description column if bytea
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'discussion_topics' AND column_name = 'description' AND data_type = 'bytea'
    ) THEN
        ALTER TABLE discussion_topics ALTER COLUMN description TYPE TEXT USING convert_from(description, 'UTF8');
    END IF;

    -- 3. Fix discussion_topics.status column if bytea
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'discussion_topics' AND column_name = 'status' AND data_type = 'bytea'
    ) THEN
        ALTER TABLE discussion_topics ALTER COLUMN status TYPE VARCHAR(20) USING convert_from(status, 'UTF8');
    END IF;
END $$;
