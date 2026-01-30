import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import pool from '../db';
import { AuthenticatedRequest, User } from '../types/express';
import { RowDataPacket } from 'mysql2';
import sendEmail from '../utils/email';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'; // Use environment variable

export const login = async (req: Request, res: Response) => {
  const { username, password } = req.body;
  
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT id, username, email, role, password FROM users WHERE username = ?', 
      [username]
    );
    const user = rows[0] as User | undefined;

    if (user && user.password && await bcrypt.compare(password, user.password)) {
      const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '1h' });
      res.json({ token, user: { id: user.id, username: user.username, email: user.email, role: user.role } });
    } else {
      res.status(401).json({ message: 'Invalid credentials' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const register = async (req: Request, res: Response) => {
    const { username, password, email, role } = req.body;
  
    // Basic validation
    if (!username || !password || !email || !role) {
      return res.status(400).json({ message: 'Please provide username, password, email and role' });
    }
  
    if (role !== 'Patient' && role !== 'Doctor' && role !== 'Admin') {
        return res.status(400).json({ message: 'Invalid role' });
    }
  
    try {
      // Check if user already exists
      const [existingUsers] = await pool.query<RowDataPacket[]>(
        'SELECT * FROM users WHERE username = ? OR email = ?',
        [username, email]
      );
  
      if (existingUsers.length > 0) {
        return res.status(409).json({ message: 'Username or email already exists' });
      }
  
      const hashedPassword = await bcrypt.hash(password, 10); // Hash the password

      const [result] = await pool.query<any>(
        'INSERT INTO users (username, password, email, role) VALUES (?, ?, ?, ?)',
        [username, hashedPassword, email, role]
      );
      const insertId = result.insertId;

      const [rows] = await pool.query<RowDataPacket[]>(
        'SELECT id, username, email, role FROM users WHERE id = ?',
        [insertId]
      );
      const newUser = rows[0] as User;
  
      const token = jwt.sign({ id: newUser.id, role: newUser.role }, JWT_SECRET, { expiresIn: '1h' });

      // Send welcome email
      const emailSubject = 'Welcome to HARMS!';
      const emailText = `Hello ${newUser.username},

Welcome to the Healthcare Appointment & Resource Management System (HARMS).

Your registration was successful. Your role is: ${newUser.role}.

You can now log in and start using the system.`;
      await sendEmail(newUser.email, emailSubject, emailText);

      res.status(201).json({ token, user: { id: newUser.id, username: newUser.username, email: newUser.email, role: newUser.role } });
    } catch (error) {
      console.error('Error during registration:', error);
      res.status(500).json({ message: 'Server error' });
    }
  };

export const getProfile = (req: AuthenticatedRequest, res: Response) => {
  res.json(req.user);
};

export const getDoctors = async (req: Request, res: Response) => {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT id, username, email FROM users WHERE role = ?',
      ['Doctor']
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getUsers = async (req: AuthenticatedRequest, res: Response) => {
  if (req.user?.role !== 'Admin') {
    return res.status(403).json({ message: 'Only admins can view users' });
  }
  try {
    const [rows] = await pool.query<RowDataPacket[]>('SELECT id, username, email, role FROM users');
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const createUser = async (req: AuthenticatedRequest, res: Response) => {
  if (req.user?.role !== 'Admin') {
    return res.status(403).json({ message: 'Only admins can create users' });
  }
  const { username, password, email, role } = req.body;
  if (!username || !password || !email || !role) {
    return res.status(400).json({ message: 'Please provide username, password, email and role' });
  }
  if (role !== 'Patient' && role !== 'Doctor' && role !== 'Admin') {
    return res.status(400).json({ message: 'Invalid role' });
  }
  try {
    const [existingUsers] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM users WHERE username = ? OR email = ?',
      [username, email]
    );
    if (existingUsers.length > 0) {
      return res.status(409).json({ message: 'Username or email already exists' });
    }
    const hashedPassword = await bcrypt.hash(password, 10); // Hash the password
    const [result] = await pool.query<any>(
      'INSERT INTO users (username, password, email, role) VALUES (?, ?, ?, ?)',
      [username, hashedPassword, email, role]
    );
    const insertId = result.insertId;
    res.status(201).json({ id: insertId, username, email, role });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateUser = async (req: AuthenticatedRequest, res: Response) => {
  if (req.user?.role !== 'Admin') {
    return res.status(403).json({ message: 'Only admins can update users' });
  }
  const { id } = req.params;
  const { username, password, email, role } = req.body;
  let updateQuery = 'UPDATE users SET';
  const queryParams: (string | number)[] = [];
  const updates: string[] = [];

  if (username) { updates.push('username = ?'); queryParams.push(username); }
  if (password) { 
    const hashedPassword = await bcrypt.hash(password, 10);
    updates.push('password = ?'); queryParams.push(hashedPassword); 
  }
  if (email) { updates.push('email = ?'); queryParams.push(email); }
  if (role) { updates.push('role = ?'); queryParams.push(role); }

  if (updates.length === 0) {
    return res.status(400).json({ message: 'No fields to update' });
  }

  updateQuery += ` ${updates.join(', ')} WHERE id = ?`;
  queryParams.push(id);

  try {
    const [result] = await pool.query(updateQuery, queryParams);
    if ((result as any).affectedRows === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ message: 'User updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteUser = async (req: AuthenticatedRequest, res: Response) => {
  if (req.user?.role !== 'Admin') {
    return res.status(403).json({ message: 'Only admins can delete users' });
  }
  const { id } = req.params;
  try {
    const [result] = await pool.query('DELETE FROM users WHERE id = ?', [id]);
    if ((result as any).affectedRows === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};