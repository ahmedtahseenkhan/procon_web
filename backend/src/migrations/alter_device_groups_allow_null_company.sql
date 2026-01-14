-- Migration: Allow NULL company_id in device_groups for generic groups
-- This enables the creation of global/generic groups that are not tied to a specific company

ALTER TABLE device_groups 
ALTER COLUMN company_id DROP NOT NULL;

-- Optional: Add a comment to document this change
COMMENT ON COLUMN device_groups.company_id IS 'Company ID - NULL for generic/global groups, otherwise references a specific company';
