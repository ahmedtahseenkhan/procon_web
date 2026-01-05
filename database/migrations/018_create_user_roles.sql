-- 018_create_user_roles.sql

-- Drop constraint from users table if it exists (legacy schema 010 assumed key on role_name)
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'users_role_name_fkey') THEN 
        ALTER TABLE users DROP CONSTRAINT users_role_name_fkey; 
    END IF; 
END $$;

-- Drop table if it exists to recreate with correct schema (including company_id and UUID pk)
DROP TABLE IF EXISTS user_roles CASCADE;

CREATE TABLE user_roles (
    role_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_name VARCHAR(255) NOT NULL,
    description TEXT,
    permissions JSONB DEFAULT '{}',
    company_id TEXT REFERENCES companies(company_id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for uniqueness
CREATE UNIQUE INDEX idx_user_roles_global_name ON user_roles(role_name) WHERE company_id IS NULL;
CREATE UNIQUE INDEX idx_user_roles_company_name ON user_roles(role_name, company_id) WHERE company_id IS NOT NULL;

-- Seed default global roles
INSERT INTO user_roles(role_name, permissions, description, company_id) VALUES
('Admin',        '{"manage_users":true,"manage_devices":true,"view_reports":true,"send_commands":true}'::jsonb, 'Full access', NULL),
('Manager',      '{"manage_users":false,"manage_devices":true,"view_reports":true,"send_commands":true}'::jsonb, 'Operations manager', NULL),
('Admin Tech',   '{"manage_users":false,"manage_devices":true,"view_reports":true,"send_commands":true}'::jsonb, 'Admin technician', NULL),
('Tech',         '{"manage_users":false,"manage_devices":true,"view_reports":false,"send_commands":false}'::jsonb, 'Technician', NULL);

-- Create role_device_groups join table
CREATE TABLE IF NOT EXISTS role_device_groups (
    role_id UUID REFERENCES user_roles(role_id) ON DELETE CASCADE,
    group_id UUID REFERENCES device_groups(group_id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, group_id)
);
