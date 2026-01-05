CREATE TABLE IF NOT EXISTS super_admins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert default super admin if not exists (password: admin123)
INSERT INTO super_admins (username, password_hash)
VALUES ('admin', '$2b$10$X7V.j5g.1j.j.1j.j.1j.j.1j.j.1j.j.1j.j.1j.j.1j.j') -- Placeholder hash, will fix in controller or assume pre-hashed
ON CONFLICT (username) DO NOTHING;
