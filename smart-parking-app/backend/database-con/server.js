const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const db = require('./database'); // Import database connection
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const validateSession = require('./middleware/validateSession');

const app = express();
const port = 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());



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

      // Compare the hashed password
      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid username or password' });
      }

      // Generate a session token
      const sessionToken = crypto.randomBytes(64).toString('hex');

      // Store the session in the database
      const insertSessionQuery = `
        INSERT INTO user_sessions (user_id, session_token, ip_address) 
        VALUES (?, ?, ?)
      `;
      const userIp = req.ip || 'unknown'; // Get the user's IP address
      db.query(insertSessionQuery, [user.user_id, sessionToken, userIp], (insertErr) => {
        if (insertErr) {
          console.error(insertErr);
          return res.status(500).json({ error: 'Failed to create session' });
        }

        // Return the session token to the client
        res.status(200).json({ message: 'Login successful', session_token: sessionToken });
      });
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});


 

app.post('/logout', validateSession, (req, res) => {
    const sessionToken = req.headers.authorization;
  
    const query = 'DELETE FROM user_sessions WHERE session_token = ?';
    db.query(query, [sessionToken], (err) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Failed to logout' });
      }
      res.status(200).json({ message: 'Logged out successfully' });
    });
  });
  
  // Start server
  app.listen(port, '0.0.0.0', () => {
    console.log(`Server running on http://192.168.163.210:${port}`);
  });

  app.get('/', (req, res) => {
    res.send('Server is running');
  });
  
  

  