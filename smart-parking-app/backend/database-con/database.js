const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: 'smartpark-db-123.mysql.database.azure.com',
  user: 'adminuser',
  password: 'SmartPark123*',
  database: 'smartpark',
  port: 3306,
  ssl: { rejectUnauthorized: true },
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// ✅ Test connection on startup
(async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Connected to Azure MySQL database');
    connection.release();
  } catch (err) {
    console.error('❌ Error connecting to Azure MySQL:', err.message);
    process.exit(1); // Exit process if DB fails
  }
})();

module.exports = pool;
