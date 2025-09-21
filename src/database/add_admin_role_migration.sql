-- Add admin role column to users table
-- Migration: Add admin role support to Mirage

-- Add role column to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'user'
CHECK (role IN ('user', 'admin'));

-- Create index for role lookups
CREATE INDEX IF NOT EXISTS idx_users_role ON users (role);

-- Create first admin user (update email/password as needed)
-- You can change the email and run this manually after deployment
-- INSERT INTO users (email, password_hash, first_name, last_name, is_verified, role)
-- VALUES (
--     'admin@example.com',
--     '$2b$12$...',  -- Replace with actual bcrypt hash of desired password
--     'Admin',
--     'User',
--     true,
--     'admin'
-- ) ON CONFLICT (email) DO UPDATE SET role = 'admin';

-- Comment: To create the first admin user, hash a password using bcrypt and replace the values above
-- Example: const bcrypt = require('bcrypt'); bcrypt.hashSync('your_admin_password', 12);