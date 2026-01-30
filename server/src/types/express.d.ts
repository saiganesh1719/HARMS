import { Request } from 'express';

export interface User {
  id: number;
  username: string;
  email: string;
  password?: string;
  role: 'Patient' | 'Doctor' | 'Admin';
}

export interface Appointment {
  id: number;
  patientId: number;
  doctorId: number;
  date: string;
  description: string;
  status: 'Pending' | 'Confirmed' | 'Cancelled' | 'Completed';
}

export interface Resource {
  id: number;
  name: string;
  type: 'bed' | 'medicine' | 'equipment';
  isAvailable?: boolean;
  quantity?: number;
}

export interface Notification {
  id: number;
  user_id: number;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface AuthenticatedRequest extends Request {
  user?: User;
}
