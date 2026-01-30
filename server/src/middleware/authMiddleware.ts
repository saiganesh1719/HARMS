
import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import pool from '../db';
import { AuthenticatedRequest, User } from '../types/express';
import { RowDataPacket } from 'mysql2';

const JWT_SECRET = 'your-secret-key'; // In a real app, use an environment variable

export const protect = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const bearer = req.headers.authorization;

  if (!bearer || !bearer.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const token = bearer.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number; role: string };
    
    const [rows] = await pool.query<RowDataPacket[]>('SELECT id, username, email, role FROM users WHERE id = ?', [decoded.id]);
    const user = rows[0] as User | undefined;

    if (user) {
      req.user = user;
      next();
    } else {
      res.status(401).json({ message: 'Unauthorized' });
    }
  } catch (error) {
    res.status(401).json({ message: 'Unauthorized' });
  }
};

export const restrictTo = (...roles: User['role'][]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'You do not have permission to perform this action' });
    }
    next();
  };
};
