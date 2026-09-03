-- V27: Super Admin and Standard Admin Classification
-- Upgrade root admin to ROLE_SUPER_ADMIN and insert standard admin admin_ops

UPDATE users
SET role_name = 'ROLE_SUPER_ADMIN'
WHERE username = 'admin' OR email = 'admin@kms.internal';

-- Insert standard admin_ops if not exists
INSERT INTO users (id, keycloak_sub, username, email, full_name, role_name, is_active, employment_status, job_title, created_at)
SELECT 
    gen_random_uuid(),
    'admin_ops_sub_' || gen_random_uuid()::text,
    'admin_ops',
    'admin.ops@kms.internal',
    'Operations Administrator',
    'ROLE_ADMIN',
    true,
    'ACTIVE',
    'Operations Admin',
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM users WHERE username = 'admin_ops' OR email = 'admin.ops@kms.internal'
);
