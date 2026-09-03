-- Migration V20: Enforce TEXT column types for blogs and discussions tables
-- Prevents PostgreSQL lower(bytea) function mismatch errors.

DO $$
BEGIN
    -- 1. Fix blogs.content column if bytea
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'blogs' AND column_name = 'content' AND data_type = 'bytea'
    ) THEN
        ALTER TABLE blogs ALTER COLUMN content TYPE TEXT USING convert_from(content, 'UTF8');
    END IF;

    -- 2. Fix discussion_topics.description column if bytea
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'discussion_topics' AND column_name = 'description' AND data_type = 'bytea'
    ) THEN
        ALTER TABLE discussion_topics ALTER COLUMN description TYPE TEXT USING convert_from(description, 'UTF8');
    END IF;

    -- 3. Fix discussion_replies.content column if bytea
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'discussion_replies' AND column_name = 'content' AND data_type = 'bytea'
    ) THEN
        ALTER TABLE discussion_replies ALTER COLUMN content TYPE TEXT USING convert_from(content, 'UTF8');
    END IF;
END $$;
