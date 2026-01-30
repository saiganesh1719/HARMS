import { Response } from 'express';
import pool from '../db';
import { AuthenticatedRequest } from '../types/express';
import { RowDataPacket } from 'mysql2';

export const createNotification = async (userId: number, message: string) => {
  try {
    await pool.query(
      'INSERT INTO notifications (user_id, message) VALUES (?, ?)',
      [userId, message]
    );
  } catch (error) {
    console.error('Error creating notification:', error);
  }
};

export const getNotifications = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const markNotificationAsRead = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  const { id } = req.params;
  try {
    const [result] = await pool.query(
      'UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );
    if ((result as any).affectedRows === 0) {
      return res.status(404).json({ message: 'Notification not found or not authorized' });
    }
    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};
