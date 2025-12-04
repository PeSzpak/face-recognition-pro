-- Face Recognition Pro Database Schema
-- Execute this in your Supabase SQL editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    hashed_password TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Persons table (extended with Face ID auth fields)
CREATE TABLE IF NOT EXISTS persons (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    active BOOLEAN DEFAULT true,
    photo_count INTEGER DEFAULT 0,
    
    -- New fields for Face ID authentication
    role VARCHAR(50) DEFAULT 'user', -- 'admin', 'manager', 'user', 'guest'
    department VARCHAR(100),
    position VARCHAR(100), -- Cargo/Posição
    employee_id VARCHAR(50), -- Matrícula/ID Funcional
    email VARCHAR(255),
    phone VARCHAR(50),
    can_use_face_auth BOOLEAN DEFAULT false, -- Permitir Face ID para login
    
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Recognition logs table
CREATE TABLE IF NOT EXISTS recognition_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    person_id UUID REFERENCES persons(id) ON DELETE SET NULL,
    confidence DECIMAL(5,4),
    image_path TEXT,
    status VARCHAR(50) NOT NULL, -- 'success', 'no_match', 'error', 'no_face'
    processing_time DECIMAL(8,4),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Face authentication logs table (new)
CREATE TABLE IF NOT EXISTS face_auth_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    person_id UUID REFERENCES persons(id) ON DELETE SET NULL,
    confidence DECIMAL(5,4),
    status VARCHAR(50) NOT NULL, -- 'success', 'failed', 'denied', 'no_face', 'no_match'
    ip_address VARCHAR(45),
    user_agent TEXT,
    processing_time DECIMAL(8,4),
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Photos table (optional - for storing image metadata)
CREATE TABLE IF NOT EXISTS person_photos (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    person_id UUID REFERENCES persons(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    filepath TEXT NOT NULL,
    width INTEGER,
    height INTEGER,
    file_size INTEGER,
    quality_score DECIMAL(3,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_persons_name ON persons(name);
CREATE INDEX IF NOT EXISTS idx_persons_active ON persons(active);
CREATE INDEX IF NOT EXISTS idx_persons_role ON persons(role);
CREATE INDEX IF NOT EXISTS idx_persons_can_use_face_auth ON persons(can_use_face_auth);
CREATE INDEX IF NOT EXISTS idx_persons_employee_id ON persons(employee_id);
CREATE INDEX IF NOT EXISTS idx_persons_email ON persons(email);
CREATE INDEX IF NOT EXISTS idx_recognition_logs_person_id ON recognition_logs(person_id);
CREATE INDEX IF NOT EXISTS idx_recognition_logs_status ON recognition_logs(status);
CREATE INDEX IF NOT EXISTS idx_recognition_logs_created_at ON recognition_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_person_photos_person_id ON person_photos(person_id);
CREATE INDEX IF NOT EXISTS idx_face_auth_logs_person_id ON face_auth_logs(person_id);
CREATE INDEX IF NOT EXISTS idx_face_auth_logs_status ON face_auth_logs(status);
CREATE INDEX IF NOT EXISTS idx_face_auth_logs_created_at ON face_auth_logs(created_at);

-- Update triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_persons_updated_at BEFORE UPDATE ON persons
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert a default admin user
-- Password: admin123 (hashed with bcrypt 4.0.1)
-- IMPORTANTE: Altere a senha após o primeiro login!
INSERT INTO users (email, username, full_name, hashed_password, is_active)
VALUES (
    'admin@facerecognition.pro',
    'admin',
    'Administrator',
    '$2b$12$hXCB7UYbPJvoEamcieQWJ.VAFIInYYztqIS8a7hBDTPyFRzZveuvW',
    true
) ON CONFLICT (email) DO UPDATE SET hashed_password = EXCLUDED.hashed_password;