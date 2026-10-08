const jwt = require('jsonwebtoken');

function protect(req, res, next) {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const match = authorization.match(/^Bearer\s+(\S+)$/i);
  if (!match) {
    return res.status(401).json({ error: 'Invalid authorization header' });
  }

  let decoded;
  try {
    decoded = jwt.verify(match[1], process.env.JWT_SECRET);
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token or token expired' });
  }

  if (!decoded || typeof decoded !== 'object' || !decoded.userId) {
    return res.status(401).json({ error: 'Invalid token payload' });
  }

  req.user = decoded; // { userId, iat, exp }
  return next();
}

module.exports = { protect };
