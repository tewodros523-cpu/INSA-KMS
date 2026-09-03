package com.enterprise.kms.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
@Order(1)
public class BlogSchemaInitializer implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(BlogSchemaInitializer.class);
    private final JdbcTemplate jdbcTemplate;

    public BlogSchemaInitializer(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(String... args) {
        try {
            log.info("Verifying and enforcing TEXT column types for blogs and discussions...");
            String sql = """
                DO $$
                BEGIN
                    IF EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'blogs' AND column_name = 'content' AND data_type = 'bytea'
                    ) THEN
                        ALTER TABLE blogs ALTER COLUMN content TYPE TEXT USING convert_from(content, 'UTF8');
                    END IF;

                    IF EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'blogs' AND column_name = 'title' AND data_type = 'bytea'
                    ) THEN
                        ALTER TABLE blogs ALTER COLUMN title TYPE VARCHAR(255) USING convert_from(title, 'UTF8');
                    END IF;

                    IF EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'blogs' AND column_name = 'category' AND data_type = 'bytea'
                    ) THEN
                        ALTER TABLE blogs ALTER COLUMN category TYPE VARCHAR(100) USING convert_from(category, 'UTF8');
                    END IF;

                    IF EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'blogs' AND column_name = 'status' AND data_type = 'bytea'
                    ) THEN
                        ALTER TABLE blogs ALTER COLUMN status TYPE VARCHAR(20) USING convert_from(status, 'UTF8');
                    END IF;

                    IF EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'blogs' AND column_name = 'author_username' AND data_type = 'bytea'
                    ) THEN
                        ALTER TABLE blogs ALTER COLUMN author_username TYPE VARCHAR(255) USING convert_from(author_username, 'UTF8');
                    END IF;

                    IF EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'discussion_topics' AND column_name = 'title' AND data_type = 'bytea'
                    ) THEN
                        ALTER TABLE discussion_topics ALTER COLUMN title TYPE VARCHAR(255) USING convert_from(title, 'UTF8');
                    END IF;

                    IF EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'discussion_topics' AND column_name = 'description' AND data_type = 'bytea'
                    ) THEN
                        ALTER TABLE discussion_topics ALTER COLUMN description TYPE TEXT USING convert_from(description, 'UTF8');
                    END IF;

                    IF EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'discussion_topics' AND column_name = 'status' AND data_type = 'bytea'
                    ) THEN
                        ALTER TABLE discussion_topics ALTER COLUMN status TYPE VARCHAR(20) USING convert_from(status, 'UTF8');
                    END IF;

                    IF EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'discussion_replies' AND column_name = 'content' AND data_type = 'bytea'
                    ) THEN
                        ALTER TABLE discussion_replies ALTER COLUMN content TYPE TEXT USING convert_from(content, 'UTF8');
                    END IF;
                END $$;
            """;
            jdbcTemplate.execute(sql);
            log.info("Blog and Discussion schema types verified.");

            var blogCols = jdbcTemplate.queryForList(
                "SELECT column_name, data_type, udt_name FROM information_schema.columns WHERE table_name = 'blogs' ORDER BY ordinal_position"
            );
            for (var col : blogCols) {
                log.info("blogs column: {} | data_type: {} | udt_name: {}", col.get("column_name"), col.get("data_type"), col.get("udt_name"));
            }
            log.info("Blog and Discussion schema types verified.");

            var columns = jdbcTemplate.queryForList(
                "SELECT column_name, data_type, udt_name FROM information_schema.columns WHERE table_name = 'discussion_topics' ORDER BY ordinal_position"
            );
            for (var col : columns) {
                log.info("discussion_topics column: {} | data_type: {} | udt_name: {}", col.get("column_name"), col.get("data_type"), col.get("udt_name"));
            }
        } catch (Exception e) {
            log.warn("Notice during Blog and Discussion schema type check: {}", e.getMessage());
        }
    }
}
