FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 9000

# Create entrypoint script for migrations and server startup
RUN echo '#!/bin/bash\nset -e\necho "Running migrations..."\npython migrate_add_difficulty_level.py\necho "Starting server..."\nexec uvicorn main:app --host 0.0.0.0 --port 9000' > /app/entrypoint.sh && chmod +x /app/entrypoint.sh

ENTRYPOINT ["/app/entrypoint.sh"]

