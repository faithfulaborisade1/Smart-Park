const mysql = require('mysql2');

const db = mysql.createConnection({
  host: 'smartpark-db-123.mysql.database.azure.com', // Replace with your host
  user: 'adminuser', // Replace with your MySQL username
  password: 'SmartPark123*', // Replace with your MySQL password
  database: 'smartpark',
  port: 3306,
  ssl: { rejectUnauthorized: true } // Replace with your database name
});


db.connect((err) => {
  if (err) {
    console.error('❌ Error connecting to Azure MySQL:', err.message);
  } else {
    console.log('✅ Connected to Azure MySQL database');
  }
});

module.exports = db; // Export the database connection
