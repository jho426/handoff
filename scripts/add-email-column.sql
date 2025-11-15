-- SQL script to add email column to nurses table
-- Run this in your Supabase SQL Editor

-- Add email column if it doesn't exist
ALTER TABLE nurses 
ADD COLUMN IF NOT EXISTS email TEXT;

-- Add unique constraint on email (optional, but recommended)
-- Uncomment the line below if you want to ensure emails are unique
-- CREATE UNIQUE INDEX IF NOT EXISTS nurses_email_unique ON nurses(email) WHERE email IS NOT NULL;

-- Add auth_user_id column if it doesn't exist (for linking auth users)
ALTER TABLE nurses 
ADD COLUMN IF NOT EXISTS auth_user_id UUID;

-- Create index on auth_user_id for faster lookups
CREATE INDEX IF NOT EXISTS nurses_auth_user_id_idx ON nurses(auth_user_id) WHERE auth_user_id IS NOT NULL;

