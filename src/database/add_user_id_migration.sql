-- Migration: Add user_id to mock_endpoints table

-- Add user_id column to mock_endpoints
ALTER TABLE mock_endpoints 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;

-- Drop the old unique constraint
DROP INDEX IF EXISTS unique_active_endpoint;

-- Create new unique constraint that includes user_id
-- This allows each user to have their own set of endpoints with the same method/url_pattern
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_endpoint_per_user 
ON mock_endpoints (user_id, method, url_pattern) 
WHERE is_active = true;

-- Create index on user_id for performance
CREATE INDEX IF NOT EXISTS idx_mock_endpoints_user_id ON mock_endpoints (user_id);

-- Create index for user_id and is_active combination (for user's active endpoints)
CREATE INDEX IF NOT EXISTS idx_mock_endpoints_user_id_active ON mock_endpoints (user_id, is_active);

-- Update existing records to have a default user_id (if any exist)
-- In production, you would need to decide how to handle existing data
-- For now, we'll leave them as NULL which will need to be handled in the application