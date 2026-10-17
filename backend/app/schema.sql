CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS persons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Older databases created `persons` with a different column set.
ALTER TABLE persons ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE persons ADD COLUMN IF NOT EXISTS department VARCHAR(120);
ALTER TABLE persons ADD COLUMN IF NOT EXISTS position VARCHAR(120);
ALTER TABLE persons ADD COLUMN IF NOT EXISTS external_id VARCHAR(60);
ALTER TABLE persons ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE persons ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    hashed_password TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS person_id UUID UNIQUE REFERENCES persons(id) ON DELETE SET NULL;
-- Face-only accounts are created for enrolled people and cannot sign in with a password.
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_login BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE users ALTER COLUMN email DROP NOT NULL;

CREATE TABLE IF NOT EXISTS face_samples (
    id UUID PRIMARY KEY,
    person_id UUID NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    quality REAL NOT NULL,
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS recognition_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source VARCHAR(20) NOT NULL CHECK (source IN ('upload', 'camera', 'face_login')),
    status VARCHAR(20) NOT NULL CHECK (status IN ('identified', 'unknown', 'no_face', 'denied')),
    person_id UUID REFERENCES persons(id) ON DELETE SET NULL,
    confidence REAL,
    faces_count INTEGER NOT NULL DEFAULT 0,
    processing_ms INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_persons_name ON persons (lower(name));
CREATE INDEX IF NOT EXISTS idx_face_samples_person ON face_samples (person_id);
CREATE INDEX IF NOT EXISTS idx_events_created ON recognition_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_person ON recognition_events (person_id, created_at DESC);

CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS persons_touch ON persons;
CREATE TRIGGER persons_touch BEFORE UPDATE ON persons FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS users_touch ON users;
CREATE TRIGGER users_touch BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
