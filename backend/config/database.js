const fs = require('fs');
const mysql = require('mysql2/promise');
const path = require('path');
const dotenv = require('dotenv');

// Prioritize backend directory .env first, then root .env, then process cwd
dotenv.config({ path: path.join(__dirname, '..', '.env') });
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });
dotenv.config();

let sslConfig = undefined;
if (process.env.AIVEN_CA_CERT) {
  sslConfig = { ca: process.env.AIVEN_CA_CERT, rejectUnauthorized: true };
} else {
  const localCaPath = path.join(__dirname, '..', 'ca.pem');
  if (fs.existsSync(localCaPath)) {
    sslConfig = { ca: fs.readFileSync(localCaPath), rejectUnauthorized: true };
  }
}

const pool = mysql.createPool({
  ...(sslConfig ? { ssl: sslConfig } : {}),
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'university_management_system',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
});

// Test connection on startup
(async () => {
  try {
    const conn = await pool.getConnection();
    console.log('✅ MySQL connected successfully');
    conn.release();
  } catch (err) {
    console.error('❌ MySQL connection failed:', err.message);
  }
})();

module.exports = pool;
