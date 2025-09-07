-- Create database schema for Mirage Dummy Data Service

-- Create mock_endpoints table
CREATE TABLE IF NOT EXISTS mock_endpoints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    method VARCHAR(10) NOT NULL CHECK (method IN ('GET', 'POST', 'PUT', 'DELETE', 'PATCH')),
    url_pattern VARCHAR(500) NOT NULL,
    request_schema JSONB,
    response_data JSONB NOT NULL,
    response_status_code INTEGER NOT NULL DEFAULT 200 CHECK (response_status_code >= 100 AND response_status_code < 600),
    response_delay_ms INTEGER DEFAULT 0 CHECK (response_delay_ms >= 0),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255)
);

-- Create unique constraint for active endpoints only
-- Using partial unique index to allow multiple inactive endpoints with same method/url_pattern
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_endpoint 
ON mock_endpoints (method, url_pattern) 
WHERE is_active = true;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_mock_endpoints_active ON mock_endpoints (is_active);
CREATE INDEX IF NOT EXISTS idx_mock_endpoints_method ON mock_endpoints (method);
CREATE INDEX IF NOT EXISTS idx_mock_endpoints_url_pattern ON mock_endpoints (url_pattern);
CREATE INDEX IF NOT EXISTS idx_mock_endpoints_created_at ON mock_endpoints (created_at DESC);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_mock_endpoints_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at timestamp
DROP TRIGGER IF EXISTS trigger_update_mock_endpoints_updated_at ON mock_endpoints;
CREATE TRIGGER trigger_update_mock_endpoints_updated_at
    BEFORE UPDATE ON mock_endpoints
    FOR EACH ROW
    EXECUTE FUNCTION update_mock_endpoints_updated_at();

