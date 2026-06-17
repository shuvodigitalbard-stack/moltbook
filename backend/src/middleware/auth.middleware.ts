// Authentication Middleware - SQLite version
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../utils/config';
import { getDB, getOne } from '../utils/db';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  team_id: string;
  is_active: number;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
  userId?: string;
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, config.jwtSecret) as {
      userId: string;
      role: string;
      teamId: string;
    };

    const db = await getDB();
    const user = getOne(db, 'SELECT id, email, name, role, team_id, is_active FROM users WHERE id = ?', [decoded.userId]);
    if (!user || !user.is_active) {
      res.status(401).json({ error: 'User not found or inactive' });
      return;
    }

    req.user = {
      id: user.id as string,
      email: user.email as string,
      name: user.name as string,
      role: user.role as string,
      team_id: user.team_id as string,
      is_active: user.is_active as number,
    };
    req.userId = user.id as string;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: 'Token expired' });
      return;
    }
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Role-based access control middleware
export const requireAuth = (...allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(req.user.role)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    next();
  };
};
