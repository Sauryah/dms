import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../lib/config';
import { TokenBlacklist } from '../lib/tokenBlacklist';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    username: string;
    role: string;
  };
  token?: string;
}

const parseCookies = (cookieHeader: string | undefined): Record<string, string> => {
  const cookies: Record<string, string> = {};
  if (!cookieHeader) return cookies;
  
  cookieHeader.split(';').forEach((cookie) => {
    const parts = cookie.split('=');
    const name = parts[0].trim();
    const value = parts.slice(1).join('=').trim();
    if (name && value) {
      cookies[name] = decodeURIComponent(value);
    }
  });
  return cookies;
};

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
  let token = req.headers.authorization?.split(' ')[1];

  // Read the token from secure HttpOnly cookie
  const cookies = parseCookies(req.headers.cookie);
  if (!token && cookies['dms_token']) {
    token = cookies['dms_token'];
  }

  // Fallback to query parameter for backward-compatible EventSource support
  if (!token && req.query.token) {
    token = req.query.token as string;
  }

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // Check if token is blacklisted
  if (TokenBlacklist.isBlacklisted(token)) {
    return res.status(401).json({ error: 'Session has been invalidated. Please log in again.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = decoded;
    req.token = token; // Store token for logout/revocation checks

    // Automatic Token Rotation (Sliding Session)
    const nowSeconds = Math.floor(Date.now() / 1000);
    if (decoded.iat && decoded.exp) {
      const totalLifetime = decoded.exp - decoded.iat;
      const elapsed = nowSeconds - decoded.iat;

      // Rotate if 50% or more of the token's lifetime has passed
      if (totalLifetime > 0 && (elapsed / totalLifetime) >= 0.5) {
        try {
          const rotatedToken = jwt.sign(
            { id: decoded.id, username: decoded.username, role: decoded.role },
            JWT_SECRET,
            { expiresIn: '24h' }
          );

          const isProduction = process.env.NODE_ENV === 'production';
          res.cookie('dms_token', rotatedToken, {
            httpOnly: true,
            secure: isProduction,
            sameSite: 'strict',
            maxAge: 24 * 60 * 60 * 1000 // 24 hours
          });

          // Blacklist the old token with a 30s grace period for concurrent in-flight requests
          TokenBlacklist.blacklist(token, decoded.exp, 30000);
        } catch (rotationError) {
          console.error('JWT Token Rotation failed:', rotationError);
        }
      }
    }

    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

export const authorize = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
};

