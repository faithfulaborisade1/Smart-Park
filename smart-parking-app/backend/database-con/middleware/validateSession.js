const db = require('../database'); // Import the database connection

const validateSession = (req, res, next) => {
  let sessionToken = req.headers.authorization;

  // Check if token exists
  if (!sessionToken) {
    return res.status(401).json({ error: 'Unauthorized: No session token provided' });
  }

  // Extract token from "Bearer <token>" format if present
  if (sessionToken.startsWith('Bearer ')) {
    sessionToken = sessionToken.split(' ')[1];
  }

  // Validate token length or format (basic security check)
  if (!sessionToken || sessionToken.length < 10) { // Adjust length as needed
    return res.status(401).json({ error: 'Unauthorized: Invalid session token format' });
  }

  const query = `
    SELECT * FROM user_sessions 
    WHERE session_token = ? AND TIMESTAMPDIFF(HOUR, last_activity, NOW()) < 2
  `;

  db.query(query, [sessionToken], (err, results) => {
    if (err) {
      // Log error internally (not to console for security), return generic message
      return res.status(500).json({ error: 'Internal server error. Please try again later.' });
    }

    if (results.length === 0) {
      return res.status(401).json({ error: 'Unauthorized: Session invalid or expired' });
    }

    // Update last activity timestamp to keep session active
    const updateQuery = 'UPDATE user_sessions SET last_activity = NOW() WHERE session_token = ?';
    db.query(updateQuery, [sessionToken], (updateErr) => {
      if (updateErr) {
        return res.status(500).json({ error: 'Internal server error. Session update failed.' });
      }

      req.session = results[0];
      next();
    });
  });
};

module.exports = validateSession;