-- ============================================================================
-- V27: Ensure Blog Posts Content Column Type is TEXT
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE lower(table_name) = 'blog_posts' 
          AND lower(column_name) = 'content' 
          AND lower(data_type) != 'text'
    ) THEN
        BEGIN
            ALTER TABLE blog_posts 
            ALTER COLUMN content TYPE TEXT 
            USING convert_from(content, 'UTF8');
        EXCEPTION WHEN OTHERS THEN
            ALTER TABLE blog_posts 
            ALTER COLUMN content TYPE TEXT 
            USING content::text;
        END;
    END IF;

    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE lower(table_name) = 'discussion_topics' 
          AND lower(column_name) = 'description' 
          AND lower(data_type) != 'text'
    ) THEN
        BEGIN
            ALTER TABLE discussion_topics 
            ALTER COLUMN description TYPE TEXT 
            USING convert_from(description, 'UTF8');
        EXCEPTION WHEN OTHERS THEN
            ALTER TABLE discussion_topics 
            ALTER COLUMN description TYPE TEXT 
            USING description::text;
        END;
    END IF;

    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE lower(table_name) = 'discussion_replies' 
          AND lower(column_name) = 'content' 
          AND lower(data_type) != 'text'
    ) THEN
        BEGIN
            ALTER TABLE discussion_replies 
            ALTER COLUMN content TYPE TEXT 
            USING convert_from(content, 'UTF8');
        EXCEPTION WHEN OTHERS THEN
            ALTER TABLE discussion_replies 
            ALTER COLUMN content TYPE TEXT 
            USING content::text;
        END;
    END IF;
END $$;
