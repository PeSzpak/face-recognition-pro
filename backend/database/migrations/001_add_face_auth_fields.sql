-- Migration: Add Face Authentication Fields to Persons Table
-- Execute this to update existing database

-- Add new columns to persons table
ALTER TABLE persons 
ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'user',
ADD COLUMN IF NOT EXISTS department VARCHAR(100),
ADD COLUMN IF NOT EXISTS position VARCHAR(100),
ADD COLUMN IF NOT EXISTS employee_id VARCHAR(50),
ADD COLUMN IF NOT EXISTS email VARCHAR(255),
ADD COLUMN IF NOT EXISTS phone VARCHAR(50),
ADD COLUMN IF NOT EXISTS can_use_face_auth BOOLEAN DEFAULT false;

-- Create face_auth_logs table
CREATE TABLE IF NOT EXISTS face_auth_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    person_id UUID REFERENCES persons(id) ON DELETE SET NULL,
    confidence DECIMAL(5,4),
    status VARCHAR(50) NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    processing_time DECIMAL(8,4),
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_persons_role ON persons(role);
CREATE INDEX IF NOT EXISTS idx_persons_can_use_face_auth ON persons(can_use_face_auth);
CREATE INDEX IF NOT EXISTS idx_persons_employee_id ON persons(employee_id);
CREATE INDEX IF NOT EXISTS idx_persons_email ON persons(email);
CREATE INDEX IF NOT EXISTS idx_face_auth_logs_person_id ON face_auth_logs(person_id);
CREATE INDEX IF NOT EXISTS idx_face_auth_logs_status ON face_auth_logs(status);
CREATE INDEX IF NOT EXISTS idx_face_auth_logs_created_at ON face_auth_logs(created_at);

-- Add comment to table
COMMENT ON COLUMN persons.role IS 'User role: admin, manager, user, guest';
COMMENT ON COLUMN persons.can_use_face_auth IS 'Allow this person to use Face ID for authentication';
COMMENT ON TABLE face_auth_logs IS 'Logs of Face ID authentication attempts';
