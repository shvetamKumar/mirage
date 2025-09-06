-- Initialize database for Docker container
-- This script runs when the PostgreSQL container starts for the first time

-- Create the development database if it doesn't exist
CREATE DATABASE mirage_dev;

-- Create the test database for testing
CREATE DATABASE mirage_test;

-- Grant privileges to the postgres user
GRANT ALL PRIVILEGES ON DATABASE mirage_dev TO postgres;
GRANT ALL PRIVILEGES ON DATABASE mirage_test TO postgres;