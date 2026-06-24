FROM python:3.11-slim

WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application files
COPY . .

# Code Engine uses PORT environment variable
# Default to 8080 if not set
ENV PORT=8080

# Expose the port
EXPOSE 8080

# Run the application
CMD uvicorn app:app --host 0.0.0.0 --port ${PORT}

# Made with Bob
