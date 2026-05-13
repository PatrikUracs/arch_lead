-- Add email verification fields to designers table
-- Apply in Supabase SQL editor or via migration tool

ALTER TABLE designers
  ADD COLUMN IF NOT EXISTS email_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS email_verification_token text;
