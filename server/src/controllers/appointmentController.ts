
import { Response } from 'express';
import pool from '../db';
import { AuthenticatedRequest } from '../types/express';
import { RowDataPacket } from 'mysql2';
import { createNotification } from './notificationController'; // New import
import sendEmail from '../utils/email';

export const getAppointments = async (req: AuthenticatedRequest, res: Response) => {
  try {
    let query = 'SELECT * FROM appointments WHERE 1=1';
    const queryParams: (string | number)[] = [];

    if (req.user?.role === 'Patient') {
      query += ' AND patient_id = ?';
      queryParams.push(req.user.id);
    } else if (req.user?.role === 'Doctor') {
      // Doctors can only see appointments they are involved in
      query += ' AND doctor_id = ?';
      queryParams.push(req.user.id);
    }

    // Filtering for Admin/Doctor roles (or if patient wants to filter their own)
    const { patient_id, doctor_id, date, status } = req.query;

    if (patient_id && (req.user?.role === 'Admin' || req.user?.role === 'Doctor')) {
      query += ' AND patient_id = ?';
      queryParams.push(patient_id as string);
    }
    if (doctor_id && (req.user?.role === 'Admin' || req.user?.role === 'Patient')) {
      query += ' AND doctor_id = ?';
      queryParams.push(doctor_id as string);
    }
    if (date) {
      query += ' AND appointment_date LIKE ?'; // Use LIKE for partial date match or exact
      queryParams.push(`${date}%`);
    }
    if (status) {
      query += ' AND status = ?';
      queryParams.push(status as string);
    }

    const [rows] = await pool.query<RowDataPacket[]>(query, queryParams);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const createAppointment = async (req: AuthenticatedRequest, res: Response) => {
  if (req.user?.role !== 'Patient') {
    return res.status(403).json({ message: 'Only patients can create appointments' });
  }

  const { doctorId, date, description } = req.body;
  const patientId = req.user.id;
  const status = 'Pending'; // Default status for new appointments

  try {
    const appointmentTime = new Date(date); // date is an ISO string

    // Helper to format Date object to MySQL DATETIME string 'YYYY-MM-DD HH:MI:SS'
    const toMySQLFormat = (d: Date) => {
        return d.toISOString().slice(0, 19).replace('T', ' ');
    };

    const startTime = new Date(appointmentTime.getTime() - 30 * 60 * 1000);
    const endTime = new Date(appointmentTime.getTime() + 30 * 60 * 1000);

    const [existingAppointments] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM appointments WHERE patient_id = ? AND appointment_date BETWEEN ? AND ?',
      [patientId, toMySQLFormat(startTime), toMySQLFormat(endTime)]
    );

    if (existingAppointments.length > 0) {
      return res.status(409).json({ message: 'This time slot is too close to another one of your appointments. Please choose a different time.' });
    }

    const [result] = await pool.query(
      'INSERT INTO appointments (patient_id, doctor_id, appointment_date, description, status) VALUES (?, ?, ?, ?, ?)',
      [patientId, doctorId, toMySQLFormat(appointmentTime), description, status]
    );
    // The type assertion here is needed because the mysql2 library returns a generic result object.
    const insertId = (result as any).insertId;
    res.status(201).json({ id: insertId, patientId, doctorId, date, description, status });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateAppointment = async (req: AuthenticatedRequest, res: Response) => {
  if (req.user?.role !== 'Admin' && req.user?.role !== 'Doctor') {
    return res.status(403).json({ message: 'Only admins or doctors can update appointments' });
  }

  const { id } = req.params;
  const { doctorId, date, description, status } = req.body;

  const toMySQLFormat = (d: string | Date) => {
    return new Date(d).toISOString().slice(0, 19).replace('T', ' ');
  };

  try {
    // Get current appointment details to check if status actually changed
    const [currentAppointments] = await pool.query<RowDataPacket[]>(
      'SELECT patient_id, status FROM appointments WHERE id = ?',
      [id]
    );
    const currentApp = currentAppointments[0];

    const [result] = await pool.query(
      'UPDATE appointments SET doctor_id = ?, appointment_date = ?, description = ?, status = ? WHERE id = ?',
      [doctorId, toMySQLFormat(date), description, status, id]
    );
    if ((result as any).affectedRows === 0) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // If status changed, create a notification and send an email
    if (currentApp && currentApp.status !== status) {
      const formattedDate = new Date(date).toLocaleDateString();
      const notificationMessage = `Your appointment on ${formattedDate} has been updated to ${status}.`;
      
      // Create in-app notification
      await createNotification(currentApp.patient_id, notificationMessage);

      // Send email for any status update
      const [patientRows] = await pool.query<RowDataPacket[]>('SELECT email, username FROM users WHERE id = ?', [currentApp.patient_id]);
      if (patientRows.length > 0) {
        const patient = patientRows[0];
        const emailSubject = `Your Appointment Status has been Updated to: ${status}`;
        const emailText = `Hello ${patient.username},

This is a notification that your appointment scheduled for ${formattedDate} has been updated.

The new status is: ${status}.

Description: ${description}

Please log in to the HARMS portal for more details.`;
        await sendEmail(patient.email, emailSubject, emailText);
      }
    }

    res.json({ message: 'Appointment updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteAppointment = async (req: AuthenticatedRequest, res: Response) => {
  if (req.user?.role !== 'Admin') {
    return res.status(403).json({ message: 'Only admins can delete appointments' });
  }

  const { id } = req.params;

  try {
    const [result] = await pool.query(
      'DELETE FROM appointments WHERE id = ?',
      [id]
    );
    if ((result as any).affectedRows === 0) {
      return res.status(404).json({ message: 'Appointment not found' });
    }
    res.json({ message: 'Appointment deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

