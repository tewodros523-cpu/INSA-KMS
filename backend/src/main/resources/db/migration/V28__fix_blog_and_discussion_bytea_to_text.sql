-- ============================================================================
-- V28: Ensure Blog and Discussion Tables Exist and Column Types are TEXT (Not BYTEA)
-- ============================================================================

CREATE TABLE IF NOT EXISTS blog_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(100) NOT NULL DEFAULT 'General',
    cover_image_url VARCHAR(500),
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    author_id UUID REFERENCES users(id) ON DELETE SET NULL,
    author_name VARCHAR(255) NOT NULL DEFAULT 'System User',
    views_count INT NOT NULL DEFAULT 0,
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS discussion_topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(100) NOT NULL DEFAULT 'General',
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    author_id UUID REFERENCES users(id) ON DELETE SET NULL,
    author_name VARCHAR(255) NOT NULL DEFAULT 'System User',
    views_count INT NOT NULL DEFAULT 0,
    replies_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS discussion_replies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic_id UUID NOT NULL REFERENCES discussion_topics(id) ON DELETE CASCADE,
    parent_reply_id UUID REFERENCES discussion_replies(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    author_id UUID REFERENCES users(id) ON DELETE SET NULL,
    author_name VARCHAR(255) NOT NULL DEFAULT 'System User',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE lower(table_name) = 'blog_posts' 
          AND lower(column_name) = 'content' 
          AND lower(data_type) != 'text'
    ) THEN
        BEGIN
            ALTER TABLE blog_posts ALTER COLUMN content TYPE TEXT USING convert_from(content, 'UTF8');
        EXCEPTION WHEN OTHERS THEN
            BEGIN
                ALTER TABLE blog_posts ALTER COLUMN content TYPE TEXT USING encode(content, 'escape');
            EXCEPTION WHEN OTHERS THEN
                ALTER TABLE blog_posts ALTER COLUMN content TYPE TEXT USING content::text;
            END;
        END;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE lower(table_name) = 'discussion_topics' 
          AND lower(column_name) = 'description' 
          AND lower(data_type) != 'text'
    ) THEN
        BEGIN
            ALTER TABLE discussion_topics ALTER COLUMN description TYPE TEXT USING convert_from(description, 'UTF8');
        EXCEPTION WHEN OTHERS THEN
            BEGIN
                ALTER TABLE discussion_topics ALTER COLUMN description TYPE TEXT USING encode(description, 'escape');
            EXCEPTION WHEN OTHERS THEN
                ALTER TABLE discussion_topics ALTER COLUMN description TYPE TEXT USING description::text;
            END;
        END;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE lower(table_name) = 'discussion_replies' 
          AND lower(column_name) = 'content' 
          AND lower(data_type) != 'text'
    ) THEN
        BEGIN
            ALTER TABLE discussion_replies ALTER COLUMN content TYPE TEXT USING convert_from(content, 'UTF8');
        EXCEPTION WHEN OTHERS THEN
            BEGIN
                ALTER TABLE discussion_replies ALTER COLUMN content TYPE TEXT USING encode(content, 'escape');
            EXCEPTION WHEN OTHERS THEN
                ALTER TABLE discussion_replies ALTER COLUMN content TYPE TEXT USING content::text;
            END;
        END;
    END IF;
END $$;
