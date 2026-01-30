
import { Response } from 'express';
import pool from '../db';
import { AuthenticatedRequest } from '../types/express';
import { RowDataPacket } from 'mysql2';

export const getResources = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const [rows] = await pool.query<RowDataPacket[]>('SELECT id, name, type, is_available, quantity FROM resources');
    // Map is_available from 0/1/null to boolean/undefined for frontend
    const resources = rows.map(r => ({
        id: r.id,
        name: r.name,
        type: r.type,
        isAvailable: r.is_available !== null ? r.is_available === 1 : undefined,
        quantity: r.quantity
    }));
    res.json(resources);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const createResource = async (req: AuthenticatedRequest, res: Response) => {
  if (req.user?.role !== 'Admin') {
    return res.status(403).json({ message: 'Only admins can create resources' });
  }

  const { name, type, isAvailable, quantity } = req.body;

  if (!name || !type) {
    return res.status(400).json({ message: 'Name and type are required' });
  }
  if (!['bed', 'medicine', 'equipment'].includes(type)) {
    return res.status(400).json({ message: 'Invalid resource type' });
  }

  const is_available = type === 'bed' || type === 'equipment' ? (isAvailable ?? true) : null;
  const finalQuantity = type === 'medicine' ? (quantity ?? 0) : null;

  try {
    const [result] = await pool.query<any>(
      'INSERT INTO resources (name, type, is_available, quantity) VALUES (?, ?, ?, ?)',
      [name, type, is_available, finalQuantity]
    );
    const insertId = result.insertId;
    res.status(201).json({ id: insertId, name, type, isAvailable: is_available, quantity: finalQuantity });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateResource = async (req: AuthenticatedRequest, res: Response) => {
  if (req.user?.role !== 'Admin') {
    return res.status(403).json({ message: 'Only admins can update resources' });
  }

  const { id } = req.params;
  const { name, type, isAvailable, quantity } = req.body;

  // Fetch the current resource to see what its type is
  const [currentResult] = await pool.query<RowDataPacket[]>('SELECT * FROM resources WHERE id = ?', [id]);
  if (currentResult.length === 0) {
    return res.status(404).json({ message: 'Resource not found' });
  }
  const currentResource = currentResult[0];

  const newName = name ?? currentResource.name;
  const newType = type ?? currentResource.type;
  let newIsAvailable = currentResource.is_available;
  let newQuantity = currentResource.quantity;

  if (newType === 'bed' || newType === 'equipment') {
    newIsAvailable = isAvailable ?? currentResource.is_available ?? true;
    newQuantity = null;
  } else if (newType === 'medicine') {
    newQuantity = quantity ?? currentResource.quantity ?? 0;
    newIsAvailable = null;
  }

  try {
    const [result] = await pool.query<any>(
      'UPDATE resources SET name = ?, type = ?, is_available = ?, quantity = ? WHERE id = ?',
      [newName, newType, newIsAvailable, newQuantity, id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Resource not found' });
    }
    res.json({ message: 'Resource updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteResource = async (req: AuthenticatedRequest, res: Response) => {
  if (req.user?.role !== 'Admin') {
    return res.status(403).json({ message: 'Only admins can delete resources' });
  }

  const { id } = req.params;

  try {
    const [result] = await pool.query<any>('DELETE FROM resources WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Resource not found' });
    }
    res.json({ message: 'Resource deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};
