-- Flyway Migration V19__blogs_and_discussions.sql
-- Additive Schema Definition for KMS Blogs & Discussions Module

-- 1. Blogs Table
CREATE TABLE IF NOT EXISTS blogs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(100) DEFAULT 'General',
    cover_image_url VARCHAR(500),
    status VARCHAR(20) DEFAULT 'DRAFT',
    author_id UUID REFERENCES users(id) ON DELETE SET NULL,
    author_username VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    published_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE blogs ADD COLUMN IF NOT EXISTS title VARCHAR(255);
ALTER TABLE blogs ADD COLUMN IF NOT EXISTS content TEXT;
ALTER TABLE blogs ADD COLUMN IF NOT EXISTS category VARCHAR(100) DEFAULT 'General';
ALTER TABLE blogs ADD COLUMN IF NOT EXISTS cover_image_url VARCHAR(500);
ALTER TABLE blogs ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'DRAFT';
ALTER TABLE blogs ADD COLUMN IF NOT EXISTS author_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE blogs ADD COLUMN IF NOT EXISTS author_username VARCHAR(100) DEFAULT 'system';
ALTER TABLE blogs ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE blogs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE blogs ADD COLUMN IF NOT EXISTS published_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_blogs_status ON blogs(status);
CREATE INDEX IF NOT EXISTS idx_blogs_author ON blogs(author_id);
CREATE INDEX IF NOT EXISTS idx_blogs_category ON blogs(category);

-- 2. Discussion Topics Table
CREATE TABLE IF NOT EXISTS discussion_topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'OPEN',
    author_id UUID REFERENCES users(id) ON DELETE SET NULL,
    author_username VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE discussion_topics ADD COLUMN IF NOT EXISTS title VARCHAR(255);
ALTER TABLE discussion_topics ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE discussion_topics ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'OPEN';
ALTER TABLE discussion_topics ADD COLUMN IF NOT EXISTS author_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE discussion_topics ADD COLUMN IF NOT EXISTS author_username VARCHAR(100) DEFAULT 'system';
ALTER TABLE discussion_topics ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE discussion_topics ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_discussion_topics_status ON discussion_topics(status);
CREATE INDEX IF NOT EXISTS idx_discussion_topics_author ON discussion_topics(author_id);

-- 3. Discussion Replies Table
CREATE TABLE IF NOT EXISTS discussion_replies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic_id UUID REFERENCES discussion_topics(id) ON DELETE CASCADE,
    parent_reply_id UUID REFERENCES discussion_replies(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    author_id UUID REFERENCES users(id) ON DELETE SET NULL,
    author_username VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE discussion_replies ADD COLUMN IF NOT EXISTS topic_id UUID REFERENCES discussion_topics(id) ON DELETE CASCADE;
ALTER TABLE discussion_replies ADD COLUMN IF NOT EXISTS parent_reply_id UUID REFERENCES discussion_replies(id) ON DELETE CASCADE;
ALTER TABLE discussion_replies ADD COLUMN IF NOT EXISTS content TEXT;
ALTER TABLE discussion_replies ADD COLUMN IF NOT EXISTS author_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE discussion_replies ADD COLUMN IF NOT EXISTS author_username VARCHAR(100) DEFAULT 'system';
ALTER TABLE discussion_replies ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE discussion_replies ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_discussion_replies_topic ON discussion_replies(topic_id);
CREATE INDEX IF NOT EXISTS idx_discussion_replies_parent ON discussion_replies(parent_reply_id);
