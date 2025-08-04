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

-- Persons table
CREATE TABLE IF NOT EXISTS persons (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    active BOOLEAN DEFAULT true,
    photo_count INTEGER DEFAULT 0,
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
CREATE INDEX IF NOT EXISTS idx_recognition_logs_person_id ON recognition_logs(person_id);
CREATE INDEX IF NOT EXISTS idx_recognition_logs_status ON recognition_logs(status);
CREATE INDEX IF NOT EXISTS idx_recognition_logs_created_at ON recognition_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_person_photos_person_id ON person_photos(person_id);

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

-- RLS (Row Level Security) policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE persons ENABLE ROW LEVEL SECURITY;
ALTER TABLE recognition_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE person_photos ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (customize based on your needs)
CREATE POLICY "Users can view own data" ON users
    FOR ALL USING (auth.uid() = id);

CREATE POLICY "Anyone can view persons" ON persons
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage persons" ON persons
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Anyone can view recognition logs" ON recognition_logs
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert recognition logs" ON recognition_logs
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Anyone can view person photos" ON person_photos
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage person photos" ON person_photos
    FOR ALL USING (auth.role() = 'authenticated');

-- Insert a default admin user (optional)
-- Remember to change the password hash in production!
INSERT INTO users (email, username, full_name, hashed_password, is_active)
VALUES (
    'admin@facerecognition.pro',
    'admin',
    'Administrator',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6hsajohkq.',  -- password: admin123
    true
) ON CONFLICT (email) DO NOTHING;