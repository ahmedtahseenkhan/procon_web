-- 015_add_total_vouchers.sql

-- Add total_vouchers column to financial_summary if it doesn't exist
ALTER TABLE financial_summary 
ADD COLUMN IF NOT EXISTS total_vouchers DECIMAL(15, 2) DEFAULT 0;

-- Optional: If we want to move data from total_cash_out (if any exists) 
-- but usually this is a new setup.
-- UPDATE financial_summary SET total_vouchers = total_cash_out WHERE total_vouchers = 0 AND total_cash_out > 0;
