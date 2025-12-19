-- 014_add_groups_and_severities.sql

-- 1. Create severity_levels table
CREATE TABLE IF NOT EXISTS severity_levels (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    label VARCHAR(50) NOT NULL,
    color VARCHAR(20) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Seed initial severity levels (mirroring migrate_severities.js)
INSERT INTO severity_levels (code, label, color)
VALUES 
    ('critical', 'Critical', 'red'),
    ('warning', 'Warning', 'orange'),
    ('normal', 'Normal', 'green'),
    ('info', 'Info', 'blue'),
    ('maintenance', 'Maintenance', 'gray')
ON CONFLICT (code) DO UPDATE SET
    label = EXCLUDED.label,
    color = EXCLUDED.color;

-- 2. Create device_groups table
CREATE TABLE IF NOT EXISTS device_groups (
    group_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(company_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_device_groups_company ON device_groups(company_id);

-- 3. Add group_id to devices table to link them
ALTER TABLE devices ADD COLUMN IF NOT EXISTS group_id UUID;
ALTER TABLE devices ADD CONSTRAINT fk_device_group FOREIGN KEY (group_id) REFERENCES device_groups(group_id);
