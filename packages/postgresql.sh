sudo apt install postgresql postgresql-contrib -y
sudo systemctl status postgresql
sudo -i -u postgres
psql
\password postgres
sudo systemctl enable postgresql

#create user
sudo -u postgres createuser --interactive
#create database
sudo -u postgres createdb mydatabase

# Create the user
CREATE USER upload WITH PASSWORD 'your_secure_password';

# Create the database (if it doesn't exist)
CREATE DATABASE upload;

-- Grant all privileges on the database
GRANT ALL PRIVILEGES ON DATABASE upload TO upload;

-- Connect to the upload database
\c upload

-- Grant all privileges on all tables in the database
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO upload;

-- Grant privileges on all sequences
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO upload;

-- Grant privileges on all functions
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO upload;

-- Set default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO upload;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO upload;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO upload;

CREATE USER s3uploader_user WITH PASSWORD 'your-secure-password';
GRANT ALL PRIVILEGES ON DATABASE s3uploader_db TO s3uploader_user;
-- The following command is crucial to allow the user to create tables.
GRANT ALL ON SCHEMA public TO upload;