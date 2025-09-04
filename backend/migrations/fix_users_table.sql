-- Fix users table to match Go model expectations

-- Add first_name and last_name columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name VARCHAR(100);

-- Copy data from full_name to first_name and last_name if full_name exists
UPDATE users 
SET 
    first_name = COALESCE(SPLIT_PART(full_name, ' ', 1), ''),
    last_name = COALESCE(NULLIF(SUBSTRING(full_name FROM POSITION(' ' IN full_name) + 1), ''), '')
WHERE full_name IS NOT NULL;

-- Add is_verified column
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;

-- Copy data from email_verified to is_verified if needed
UPDATE users SET is_verified = email_verified;

-- Drop the username constraint temporarily
ALTER TABLE users ALTER COLUMN username DROP NOT NULL;

-- Make username optional (we'll use email as the unique identifier)
UPDATE users SET username = email WHERE username IS NULL;