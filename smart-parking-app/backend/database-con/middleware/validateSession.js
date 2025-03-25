const db = require('../database'); // Import database connection

const validateSession = async (req, res, next) => {
  try {
    let sessionToken = req.headers.authorization;

    if (!sessionToken) {
      return res.status(401).json({ error: 'Unauthorized: No session token provided' });
    }

    // Extract token from "Bearer <token>" format if present
    if (sessionToken.startsWith('Bearer ')) {
      sessionToken = sessionToken.split(' ')[1];
    }

    // Validate token length (basic security check)
    if (!sessionToken || sessionToken.length < 10) { // Adjust length as needed
      return res.status(401).json({ error: 'Unauthorized: Invalid session token format' });
    }

    const connection = await db.getConnection(); // Ensure a proper connection

    // Check if session is valid and not expired
    const [results] = await connection.query(
      `SELECT * FROM user_sessions WHERE session_token = ? AND TIMESTAMPDIFF(HOUR, last_activity, NOW()) < 2`, 
      [sessionToken]
    );

    if (results.length === 0) {
      connection.release(); // Release before returning
      return res.status(401).json({ error: 'Unauthorized: Session invalid or expired' });
    }

    // Update last activity timestamp to keep session alive
    await connection.query(
      'UPDATE user_sessions SET last_activity = NOW() WHERE session_token = ?', 
      [sessionToken]
    );

    connection.release(); // Always release connection

    req.session = results[0]; // Attach session to request
    next();
  } catch (error) {
    console.error('🔴 SESSION VALIDATION ERROR:', error);
    res.status(500).json({ error: 'Internal server error. Please try again later.' });
  }
};

module.exports = validateSession;
