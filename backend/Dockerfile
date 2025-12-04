# Use Python 3.10 slim image
FROM python:3.10-slim

# Install system dependencies for OpenCV and face recognition
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender1 \
    libgomp1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Copy and set permissions for startup script
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh

# Ensure uploads directory exists (may already be copied)
RUN mkdir -p uploads || true

# Expose port
EXPOSE 8000

# Start application
CMD ["/app/start.sh"]
