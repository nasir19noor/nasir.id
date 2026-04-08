import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL || 'postgres://localhost:5432/nasir';
const isLocal = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
const sslMode = process.env.NODE_ENV === 'production' && !isLocal ? 'require' : false;

const sql = postgres(connectionString, {
  ssl: sslMode,
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

export default sql;