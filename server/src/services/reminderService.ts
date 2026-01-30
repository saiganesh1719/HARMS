import cron from 'node-cron';
import pool from '../db';
import { RowDataPacket } from 'mysql2';
import sendEmail from '../utils/email';

const scheduleReminderEmails = () => {
  // Schedule a job to run every day at 8:00 AM
  cron.schedule('0 8 * * *', async () => {
    console.log('Running daily reminder job for upcoming appointments...');
    try {
      const [appointments] = await pool.query<RowDataPacket[]>(
        "SELECT a.id, a.appointment_date, a.description, p.username, p.email FROM appointments a JOIN users p ON a.patient_id = p.id WHERE DATE(a.appointment_date) = CURDATE() AND a.status = 'Confirmed'"
      );

      if (appointments.length === 0) {
        console.log('No confirmed appointments scheduled for today.');
        return;
      }

      console.log(`Found ${appointments.length} appointments for today. Sending reminders...`);

      for (const app of appointments) {
        const emailSubject = 'Appointment Reminder';
        const appointmentTime = new Date(app.appointment_date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        const emailText = `Hello ${app.username},

This is a reminder for your appointment scheduled for today at ${appointmentTime}.

Description: ${app.description}

Please log in to the HARMS portal for more details.`;
        
        await sendEmail(app.email, emailSubject, emailText);
      }
    } catch (error) {
      console.error('Error sending reminder emails:', error);
    }
  });
};

export default scheduleReminderEmails;
