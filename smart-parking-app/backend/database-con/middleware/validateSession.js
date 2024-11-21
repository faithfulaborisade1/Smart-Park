const db = require('../database'); // Import the database connection

const validateSession = (req, res, next) => {
  const sessionToken = req.headers.authorization;

  if (!sessionToken) {
    return res.status(401).json({ error: 'Unauthorized: No session token provided' });
  }

  const query = `
    SELECT * FROM user_sessions 
    WHERE session_token = ? AND TIMESTAMPDIFF(MINUTE, last_activity, NOW()) < 30
  `;
  db.query(query, [sessionToken], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Database error' });
    }

    if (results.length === 0) {
      return res.status(401).json({ error: 'Unauthorized: Invalid or expired session' });
    }

    const updateQuery = 'UPDATE user_sessions SET last_activity = NOW() WHERE session_token = ?';
    db.query(updateQuery, [sessionToken], (updateErr) => {
      if (updateErr) {
        console.error(updateErr);
        return res.status(500).json({ error: 'Failed to update session' });
      }

      req.session = results[0];
      next();
    });
  });
};

module.exports = validateSession;
