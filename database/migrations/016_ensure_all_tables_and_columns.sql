-- 016_ensure_all_tables_and_columns.sql

-- 1. Ensure device_command_log exists (was filtered in some migration flows)
CREATE TABLE IF NOT EXISTS device_command_log (
    id SERIAL PRIMARY KEY,
    device_id TEXT NOT NULL,
    action TEXT NOT NULL,
    username TEXT NOT NULL,
    status TEXT NOT NULL,
    response JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Ensure device_packets exists (needed for some device models)
CREATE TABLE IF NOT EXISTS device_packets (
    packet_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    account_id TEXT,
    row_limit INTEGER,
    device_data JSONB
);

-- 3. Ensure financial_summary has all required columns
ALTER TABLE financial_summary 
ADD COLUMN IF NOT EXISTS total_vouchers DECIMAL(15, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_cash_out DECIMAL(15, 2) DEFAULT 0; -- Keep legacy name if present

-- 4. Ensure severity_levels and device_groups exist (Idempotent 014)
CREATE TABLE IF NOT EXISTS severity_levels (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    label VARCHAR(50) NOT NULL,
    color VARCHAR(20) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO severity_levels (code, label, color)
VALUES 
    ('critical', 'Critical', 'red'),
    ('warning', 'Warning', 'orange'),
    ('normal', 'Normal', 'green'),
    ('info', 'Info', 'blue'),
    ('maintenance', 'Maintenance', 'gray')
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS device_groups (
    group_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(company_id)
);

CREATE INDEX IF NOT EXISTS idx_device_groups_company ON device_groups(company_id);

-- 5. Ensure device column additions
ALTER TABLE devices ADD COLUMN IF NOT EXISTS group_id UUID;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS group_name TEXT; -- Used in sync logic
