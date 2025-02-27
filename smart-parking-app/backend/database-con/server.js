// const { FLASK_BASE_URL } = require('./config');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const db = require('./database'); // Import database connection
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const validateSession = require('./middleware/validateSession');
const { body, validationResult } = require('express-validator');
// const notificationRoutes = require('./routes/notifications')

const app = express();
const port = 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
/* The line `app.use('/api', notificationRoutes);` is mounting the `notificationRoutes` middleware at
the `/api` path in the Express application. This means that any requests that start with `/api` will
be passed to the `notificationRoutes` middleware for further processing. */
// app.use('/api', notificationRoutes);



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



//   app.get('/api/parking-status', (req, res) => {
//     console.log('Received request for parking status');
//     const query = 'SELECT space_id, space_number, status FROM parking_spaces';
//     db.query(query, (err, results) => {
//         if (err) {
//             console.error(err);
//             return res.status(500).json({ error: 'Database error' });
//         }
//         console.log('Sending response:', results);
//         res.status(200).json(results);
//     });
// });

// app.get('/api/parking-status', (req, res) => {
//   const area = req.query.lot || 'EB1'; // 'lot' in query, but should match area_id

//   if (!area.match(/^[A-Za-z0-9_-]+$/)) {  
//       return res.status(400).json({ error: 'Invalid area ID' });
//   }

//   const query = 'SELECT * FROM parking_spaces WHERE area_id = ?'; // area_id instead of lot_id
//   db.query(query, [area], (err, results) => {
//       if (err) {
//           console.error(err);
//           return res.status(500).json({ error: 'Database error' });
//       }
//       res.json(results);
//   });
// });

app.get('/api/parking-status', (req, res) => {
  const { lot } = req.query;

  if (!lot) {
      return res.status(400).json([]); // Always return an array if no lot is provided
  }

  const query = 'SELECT * FROM parking_spaces WHERE area_id = ?';
  db.query(query, [lot], (err, results) => {
      if (err) {
          console.error("Database error:", err);
          return res.status(500).json([]); // Return an empty array on error
      }

      res.json(Array.isArray(results) ? results : []); // Ensure response is always an array
  });
});

app.get('/api/parking-summary', (req, res) => {
  const query = `
      SELECT 
          COUNT(*) AS total, 
          SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) AS available, 
          SUM(CASE WHEN status = 'occupied' THEN 1 ELSE 0 END) AS occupied, 
          SUM(CASE WHEN status = 'reserved' THEN 1 ELSE 0 END) AS reserved 
      FROM parking_spaces
  `;

  db.query(query, (err, results) => {
      if (err) {
          console.error("Database error:", err);
          return res.status(500).json({ total: 0, available: 0, occupied: 0, reserved: 0 });
      }

      res.json(results[0]); // ✅ Send totals as an object
  });
});



app.get('/api/parking-lots', (req, res) => {
  const query = 'SELECT area_id AS id, name FROM parking_areas';

  db.query(query, (err, results) => {
      if (err) {
          console.error("Database error:", err);
          return res.status(500).json([]); // Always return an array on error
      }
      res.json(results.length > 0 ? results : []); // Ensure response is always an array
  });
});


app.get('/api/parking-space/:space_id', (req, res) => {
  const { space_id } = req.params;

  const query = 'SELECT space_id, space_number, latitude, longitude FROM parking_spaces WHERE space_id = ?';
  db.query(query, [space_id], (err, results) => {
      if (err) {
          console.error("Database error:", err);
          return res.status(500).json({ error: 'Database error' });
      }

      if (results.length === 0) {
          return res.status(404).json({ error: 'Parking space not found' });
      }

      res.json(results[0]); // Return the first matching result
  });
});

// 📌 Add a new notification
app.post('/api/notifications', (req, res) => {
  const { message, parking_space_id } = req.body;

  if (!message || !parking_space_id) {
      return res.status(400).json({ error: "Message and parking_space_id are required" });
  }

  const query = `INSERT INTO notifications (user_id, message, parking_space_id, is_read) VALUES (NULL, ?, ?, 0)`;
  db.query(query, [message, parking_space_id], (err, result) => {
      if (err) {
          console.error("Database error:", err);
          return res.status(500).json({ error: "Failed to insert notification" });
      }
      res.status(201).json({ message: "Notification added", notification_id: result.insertId });
  });
});

// 📌 Fetch all notifications
app.get('/api/notifications', (req, res) => {
  const query = `
      SELECT n.notification_id, n.message, n.created_at, ps.space_number, pa.name AS area_name
      FROM notifications n
      LEFT JOIN parking_spaces ps ON n.parking_space_id = ps.space_id
      LEFT JOIN parking_areas pa ON ps.area_id = pa.area_id
      ORDER BY n.created_at DESC
  `;

  db.query(query, (err, results) => {
      if (err) {
          console.error("Database error:", err);
          return res.status(500).json({ error: "Failed to fetch notifications" });
      }

      // Format messages to include area & slot
      const formattedNotifications = results.map(notif => ({
          notification_id: notif.notification_id,
          message: `⚠️ ${notif.area_name} - Slot ${notif.space_number}: ${notif.message}`,
          created_at: notif.created_at
      }));

      res.status(200).json(formattedNotifications);
  });
});

// 📌 Mark a notification as read
app.put('/api/notifications/:id/read', (req, res) => {
  const { id } = req.params;
  const query = `UPDATE notifications SET is_read = 1 WHERE notification_id = ?`;

  db.query(query, [id], (err, result) => {
      if (err) {
          console.error("Database error:", err);
          return res.status(500).json({ error: "Failed to update notification" });
      }
      res.status(200).json({ message: "Notification marked as read" });
  });
});

// 📌 Delete a notification
app.delete('/api/notifications/:id', (req, res) => {
  const { id } = req.params;
  const query = `DELETE FROM notifications WHERE notification_id = ?`;

  db.query(query, [id], (err, result) => {
      if (err) {
          console.error("Database error:", err);
          return res.status(500).json({ error: "Failed to delete notification" });
      }
      res.status(200).json({ message: "Notification deleted" });
  });
});


app.post('/api/detect_violation', (req, res) => {
  const { parking_space_id, license_plate } = req.body;

  if (!parking_space_id) {
      return res.status(400).json({ error: "Missing parking_space_id" });
  }

  const message = `🚧 Parking Violation Detected: Slot ${parking_space_id} is obstructed.`;

  const query = `INSERT INTO notifications (user_id, message, parking_space_id, is_read) VALUES (NULL, ?, ?, 0)`;
  db.query(query, [message, parking_space_id], (err, result) => {
      if (err) {
          console.error("Database error:", err);
          return res.status(500).json({ error: "Failed to insert notification" });
      }
      res.status(201).json({ message: "Violation recorded", notification: message });
  });
});


  
  // Start server
  app.listen(port, '0.0.0.0', () => {
    console.log(`Server running on http://192.168.112.210:${port}`);
  });

  app.get('/', (req, res) => {
    res.send('Server is running');
  });
  
  

  