#!/bin/bash
set -e

# Unset TF_USE_LEGACY_KERAS if it was set
unset TF_USE_LEGACY_KERAS

echo "🚀 Starting Face Recognition Backend..."

# Wait for PostgreSQL
echo "⏳ Waiting for PostgreSQL..."
python -c "
import psycopg2
import time
import os

max_retries = 30
retry_count = 0

while retry_count < max_retries:
    try:
        conn = psycopg2.connect(
            dbname=os.getenv('POSTGRES_DB', 'face_recognition'),
            user=os.getenv('POSTGRES_USER', 'admin'),
            password=os.getenv('POSTGRES_PASSWORD', 'admin123'),
            host=os.getenv('POSTGRES_HOST', 'postgres'),
            port=os.getenv('POSTGRES_PORT', '5432')
        )
        conn.close()
        print('✓ PostgreSQL is ready!')
        break
    except Exception as e:
        retry_count += 1
        print(f'Waiting for PostgreSQL... ({retry_count}/{max_retries})')
        time.sleep(1)
"

# Start application
echo "✓ Starting application..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

