const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');

const app = express();
const port = 5000;

const cors = require('cors');
app.use(cors());


// Middleware
app.use(bodyParser.json());

// MySQL Connection
const db = mysql.createConnection({
  host: 'localhost', // Replace with your database host
  user: 'root', // Replace with your MySQL username
  password: '', // Replace with your MySQL password
  database: 'smartpark', // Replace with your database name
});

db.connect((err) => {
  if (err) {
    console.error('Error connecting to database:', err.message);
  } else {
    console.log('Connected to MySQL database');
  }
});

// Routes
const bcrypt = require('bcryptjs'); // Import bcrypt

app.post('/signup', async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    // Generate a salt
    const salt = await bcrypt.genSalt(10);

    // Hash the password with the salt
    const hashedPassword = await bcrypt.hash(password, salt);

    // Insert user into the database
    const query = 'INSERT INTO users (username, email, password_hash, salt) VALUES (?, ?, ?, ?)';
    db.query(query, [username, email, hashedPassword, salt], (err) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Database error' });
      }
      res.status(201).json({ message: 'User created successfully' });
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

  

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
  
    if (!username || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }
  
    try {
      // Fetch the user from the database
      const query = 'SELECT * FROM users WHERE username = ?';
      db.query(query, [username], async (err, results) => {
        if (err) {
          console.error(err);
          return res.status(500).json({ error: 'Database error' });
        }
  
        if (results.length === 0) {
          return res.status(401).json({ error: 'Invalid username or password' });
        }
  
        const user = results[0];
  
        // Compare the hashed password with the entered password
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
          return res.status(401).json({ error: 'Invalid username or password' });
        }
  
        // Login successful
        res.status(200).json({ message: 'Login successful' });
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Server error' });
    }
  });
  
  

// Start server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
