const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const db = require('./database');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const validateSession = require('./middleware/validateSession');

const app = express();
const port = 5000;

// Predefined avatar options
const avatarOptions = [
  'https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3FtdjVmdjJsc2xrdzI5cXF3NmR2M3Y0bTFsY2w4amFheDVhYjZ5ZyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3o85xIO33l7R9fci9W/giphy.gif', // Dog
  'https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExYTZmdmM2YzNrbjBweDV5c2xweDNodjN2c2x3cHFydmZhM3U5a2I5NiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/l0MYt5jPRARvPN4s8/giphy.gif', // Cat
  'https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExNTN3aGNkN2w3aHVvM3FocTBtdTFreWdxdTJvN3RtdjU0NHZhZDV6NiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/26FPy3QZQqGtDcrja/giphy.gif', // Robot
  'https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExaXF3eDJ2a3J5a3Y5cG5mZGpueHNyM2ZhZmN2aWp1aW1idnM2dG1rZiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3o6Zt6KHxJTzLpxD0I/giphy.gif', // Astronaut
];

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Signup Endpoint
app.post('/signup', async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'SIGNUP-001: Username, email, and password are required' });
  }

  try {
    const [existingUser] = await db.query('SELECT * FROM users WHERE username = ? OR email = ?', [username, email]);
    if (existingUser.length > 0) {
      return res.status(409).json({ error: 'SIGNUP-002: Username or email already taken' });
    }

    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(password, salt);
    const randomAvatar = avatarOptions[Math.floor(Math.random() * avatarOptions.length)];

    await db.query(
      'INSERT INTO users (username, email, password_hash, salt, avatar, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())',
      [username, email, hashedPassword, salt, randomAvatar]
    );

    res.status(201).json({ message: 'SIGNUP-000: User registered successfully' });
  } catch (error) {
    console.error('🔴 SIGNUP ERROR:', error);
    res.status(500).json({ error: 'SIGNUP-003: Server error during registration' });
  }
});

// Login Endpoint
app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'LOGIN-001: Username and password are required' });
  }

  let connection;
  try {
    connection = await db.getConnection(); // Get a connection from the pool
    const [users] = await connection.query('SELECT * FROM users WHERE username = ?', [username]);
    if (!users.length) {
      return res.status(401).json({ error: 'LOGIN-003: Invalid username or password' });
    }

    const user = users[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'LOGIN-003: Invalid username or password' });
    }

    const sessionToken = crypto.randomBytes(64).toString('hex');
    await connection.query(
      'INSERT INTO user_sessions (user_id, session_token, ip_address) VALUES (?, ?, ?)',
      [user.user_id, sessionToken, req.ip || 'unknown']
    );

    const isAdmin = user.username === 'admin';
    res.status(200).json({
      message: 'LOGIN-000: Login successful',
      session_token: sessionToken,
      isAdmin,
    });
  } catch (error) {
    console.error('🔴 LOGIN ERROR:', error);
    res.status(500).json({ error: 'LOGIN-005: Server error during login' });
  } finally {
    if (connection) connection.release(); // Release the connection back to the pool
  }
});

// Logout Endpoint

app.post('/logout', validateSession, async (req, res) => {
  console.log("📌 Logout request received");

  try {
    const sessionToken = req.session?.session_token; // Retrieve session token from validated session

    if (!sessionToken) {
      console.log("🔴 No active session found");
      return res.status(400).json({ error: 'LOGOUT-001: No active session found' });
    }

    const connection = await db.getConnection();
    console.log("✅ Database connection established");

    const [result] = await connection.query(
      'DELETE FROM user_sessions WHERE session_token = ?', 
      [sessionToken]
    );
    
    connection.release();
    console.log("✅ Connection released");

    if (result.affectedRows === 0) {
      console.log("🔴 Session token not found in database");
      return res.status(404).json({ error: 'LOGOUT-003: Session not found or already logged out' });
    }

    console.log("✅ Logout Successful: Session deleted from database");
    res.status(200).json({ message: 'LOGOUT-000: Logged out successfully' });
  } catch (error) {
    console.error("🔴 LOGOUT ERROR:", error);
    res.status(500).json({ error: 'LOGOUT-002: Server error during logout' });
  }
});





// Update Profile Endpoint
app.put('/api/update-profile', validateSession, async (req, res) => {
  const sessionToken = req.headers.authorization?.split(' ')[1] || req.headers.authorization;
  const { username, email, password, avatar } = req.body;

  if (!username && !email && !password && !avatar) {
    return res.status(400).json({ error: 'PROFILE-001: At least one field must be provided' });
  }

  try {
    const [session] = await db.query('SELECT user_id FROM user_sessions WHERE session_token = ?', [sessionToken]);
    if (!session.length) {
      return res.status(401).json({ error: 'PROFILE-002: Invalid or expired session token' });
    }
    const userId = session[0].user_id;

    const [currentUser] = await db.query('SELECT * FROM users WHERE user_id = ?', [userId]);
    if (!currentUser.length) {
      return res.status(404).json({ error: 'PROFILE-003: User not found' });
    }

    const updates = {};
    if (username && username !== currentUser[0].username) {
      const [existingUsername] = await db.query('SELECT * FROM users WHERE username = ? AND user_id != ?', [username, userId]);
      if (existingUsername.length > 0) {
        return res.status(409).json({ error: 'PROFILE-004: Username already taken' });
      }
      updates.username = username;
    }
    if (email && email !== currentUser[0].email) {
      const [existingEmail] = await db.query('SELECT * FROM users WHERE email = ? AND user_id != ?', [email, userId]);
      if (existingEmail.length > 0) {
        return res.status(409).json({ error: 'PROFILE-005: Email already in use' });
      }
      updates.email = email;
    }
    if (password) {
      const salt = bcrypt.genSaltSync(10);
      updates.password_hash = bcrypt.hashSync(password, salt);
      updates.salt = salt;
    }
    if (avatar) updates.avatar = avatar;

    if (!Object.keys(updates).length) {
      return res.status(400).json({ error: 'PROFILE-006: No changes provided to update' });
    }

    await db.query(
      'UPDATE users SET username = ?, email = ?, password_hash = ?, salt = ?, avatar = ? WHERE user_id = ?',
      [
        updates.username || currentUser[0].username,
        updates.email || currentUser[0].email,
        updates.password_hash || currentUser[0].password_hash,
        updates.salt || currentUser[0].salt,
        updates.avatar || currentUser[0].avatar,
        userId,
      ]
    );

    res.status(200).json({ message: 'PROFILE-000: Profile updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'PROFILE-007: Server error during profile update' });
  }
});

// Parking-Related Endpoints
app.get('/api/parking-status', async (req, res) => {
  const { lot } = req.query;
  if (!lot) return res.status(400).json({ error: 'PARKING-001: Lot parameter is required' });

  try {
    const [results] = await db.query('SELECT * FROM parking_spaces WHERE area_id = ?', [lot]);
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: 'PARKING-002: Server error fetching parking status' });
  }
});

app.get('/api/parking-summary', async (req, res) => {
  const query = `
    SELECT 
      COUNT(*) AS total, 
      SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) AS available, 
      SUM(CASE WHEN status = 'occupied' THEN 1 ELSE 0 END) AS occupied, 
      SUM(CASE WHEN status = 'reserved' THEN 1 ELSE 0 END) AS reserved 
    FROM parking_spaces
  `;

  try {
    const [results] = await db.query(query);
    res.json(results[0]);
  } catch (error) {
    console.error('🔴 Parking Summary Error:', error);
    res.status(500).json({ total: 0, available: 0, occupied: 0, reserved: 0 });
  }
});

app.get('/api/parking-lots', async (req, res) => {
  try {
    const [results] = await db.query('SELECT area_id AS id, name FROM parking_areas');
    res.json(results);
  } catch (error) {
    res.status(500).json([]);
  }
});

app.get('/api/parking-space/:space_id', async (req, res) => {
  const { space_id } = req.params;

  try {
    const [results] = await db.query(
      'SELECT space_id, space_number, latitude, longitude FROM parking_spaces WHERE space_id = ?',
      [space_id]
    );
    if (!results.length) {
      return res.status(404).json({ error: 'PARKING-003: Parking space not found' });
    }
    res.json(results[0]);
  } catch (error) {
    res.status(500).json({ error: 'PARKING-004: Server error fetching parking space' });
  }
});

app.put('/api/update-parking-status/:space_id', async (req, res) => {
  const { space_id } = req.params;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ error: 'PARKING-005: New status is required' });
  }

  try {
    const [result] = await db.query(
      'UPDATE parking_spaces SET status = ? WHERE space_id = ?',
      [status, space_id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'PARKING-006: Parking space not found' });
    }
    res.status(200).json({ message: 'PARKING-000: Parking status updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'PARKING-007: Server error updating parking status' });
  }
});

app.post('/api/add-parking-lot', async (req, res) => {
  const { name, description, total_spaces, available_spaces } = req.body;

  if (!name || !description || !total_spaces || !available_spaces) {
    return res.status(400).json({ error: 'PARKING-008: All fields are required' });
  }

  const areaId = name.replace(/\s+/g, '').toUpperCase();

  try {
    await db.query(
      'INSERT INTO parking_areas (area_id, name, description, total_spaces, available_spaces) VALUES (?, ?, ?, ?, ?)',
      [areaId, name, description, total_spaces, available_spaces]
    );
    res.status(201).json({ message: 'PARKING-009: Parking lot added successfully' });
  } catch (error) {
    res.status(500).json({ error: 'PARKING-010: Server error adding parking lot' });
  }
});

// Notification Endpoints
app.post('/api/notifications', async (req, res) => {
  const { message, parking_space_id } = req.body;

  if (!message || !parking_space_id) {
    return res.status(400).json({ error: 'NOTIF-001: Message and parking_space_id are required' });
  }

  try {
    const [result] = await db.query(
      'INSERT INTO notifications (user_id, message, parking_space_id, is_read) VALUES (NULL, ?, ?, 0)',
      [message, parking_space_id]
    );
    res.status(201).json({ message: 'NOTIF-000: Notification added', notification_id: result.insertId });
  } catch (error) {
    res.status(500).json({ error: 'NOTIF-002: Server error adding notification' });
  }
});

app.get('/api/notifications', async (req, res) => {
  const query = `
    SELECT n.notification_id, n.message, n.created_at, ps.space_number, pa.name AS area_name
    FROM notifications n
    LEFT JOIN parking_spaces ps ON n.parking_space_id = ps.space_id
    LEFT JOIN parking_areas pa ON ps.area_id = pa.area_id
    ORDER BY n.created_at DESC
  `;

  try {
    const [results] = await db.query(query);
    const formattedNotifications = results.map(notif => ({
      notification_id: notif.notification_id,
      message: `⚠️ ${notif.area_name} - Slot ${notif.space_number}: ${notif.message}`,
      created_at: notif.created_at
    }));
    res.status(200).json(formattedNotifications);
  } catch (error) {
    res.status(500).json({ error: 'NOTIF-003: Server error fetching notifications' });
  }
});

app.put('/api/notifications/:id/read', async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await db.query('UPDATE notifications SET is_read = 1 WHERE notification_id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'NOTIF-004: Notification not found' });
    }
    res.status(200).json({ message: 'NOTIF-005: Notification marked as read' });
  } catch (error) {
    res.status(500).json({ error: 'NOTIF-006: Server error updating notification' });
  }
});

app.delete('/api/notifications/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await db.query('DELETE FROM notifications WHERE notification_id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'NOTIF-007: Notification not found' });
    }
    res.status(200).json({ message: 'NOTIF-008: Notification deleted' });
  } catch (error) {
    res.status(500).json({ error: 'NOTIF-009: Server error deleting notification' });
  }
});

// Duplicate endpoint removed (there were two identical /api/notifications/:id/read and /delete endpoints)
// Keeping only one of each

app.post('/api/update-parking-statuses', async (req, res) => {
  const { spaces } = req.body;

  if (!Array.isArray(spaces) || !spaces.length) {
    return res.status(400).json({ error: 'PARKING-011: Invalid or empty spaces array' });
  }

  try {
    const updates = spaces.map(async ({ space_id, status }) => {
      const [current] = await db.query('SELECT status FROM parking_spaces WHERE space_id = ?', [space_id]);
      if (!current.length) throw new Error(`Space ${space_id} not found`);
      const newStatus = current[0].status === 'reserved' ? current[0].status : status;
      await db.query('UPDATE parking_spaces SET status = ? WHERE space_id = ?', [newStatus, space_id]);
    });

    await Promise.all(updates);
    res.status(200).json({ message: 'PARKING-012: Parking statuses updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'PARKING-013: Server error updating parking statuses' });
  }
});

app.get('/api/parking-spaces', async (req, res) => {
  try {
    const [results] = await db.query(
      'SELECT space_id, space_number, area_id, status, latitude, longitude, x1, y1, x2, y2 FROM parking_spaces'
    );
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: 'PARKING-014: Server error fetching parking spaces' });
  }
});

app.post('/api/detect_violation', async (req, res) => {
  const { parking_space_id, license_plate } = req.body;

  if (!parking_space_id) {
    return res.status(400).json({ error: 'VIOLATION-001: Parking_space_id is required' });
  }

  const message = `🚧 Parking Violation Detected: Slot ${parking_space_id} is obstructed${license_plate ? ` (License: ${license_plate})` : ''}.`;

  try {
    await db.query(
      'INSERT INTO notifications (user_id, message, parking_space_id, is_read) VALUES (NULL, ?, ?, 0)',
      [message, parking_space_id]
    );
    res.status(201).json({ message: 'VIOLATION-000: Violation recorded', notification: message });
  } catch (error) {
    res.status(500).json({ error: 'VIOLATION-002: Server error recording violation' });
  }
});

app.post('/api/send-notification', async (req, res) => {
  const { message, parking_space_id } = req.body;

  if (!message || !parking_space_id) {
    return res.status(400).json({ error: 'NOTIF-010: Message and parking_space_id are required' });
  }

  try {
    const [result] = await db.query(
      'INSERT INTO notifications (user_id, message, parking_space_id, is_read) VALUES (NULL, ?, ?, 0)',
      [message, parking_space_id]
    );
    res.status(201).json({ message: 'NOTIF-011: Notification sent successfully', notification_id: result.insertId });
  } catch (error) {
    res.status(500).json({ error: 'NOTIF-012: Server error sending notification' });
  }
});

// Root Route
app.get('/', (req, res) => {
  res.send('Server is running');
});

// Start Server with Database Check
async function startServer() {
  try {
    await db.query('SELECT 1');
    console.log('✅ Database ready');
    app.listen(port, '0.0.0.0', () => {
      console.log(`Server running on port ${port}`);
    });
  } catch (error) {
    console.error('🔴 Failed to start server due to database error:', error);
    process.exit(1);
  }
}

startServer();