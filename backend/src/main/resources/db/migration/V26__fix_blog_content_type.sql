-- ============================================================================
-- V26: Fix Blog Posts Content Column Type (BYTEA -> TEXT)
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'blog_posts' 
          AND column_name = 'content' 
          AND data_type = 'bytea'
    ) THEN
        ALTER TABLE blog_posts 
        ALTER COLUMN content TYPE TEXT 
        USING convert_from(content, 'UTF8');
    END IF;

    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'discussion_topics' 
          AND column_name = 'description' 
          AND data_type = 'bytea'
    ) THEN
        ALTER TABLE discussion_topics 
        ALTER COLUMN description TYPE TEXT 
        USING convert_from(description, 'UTF8');
    END IF;

    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'discussion_replies' 
          AND column_name = 'content' 
          AND data_type = 'bytea'
    ) THEN
        ALTER TABLE discussion_replies 
        ALTER COLUMN content TYPE TEXT 
        USING convert_from(content, 'UTF8');
    END IF;
END $$;
