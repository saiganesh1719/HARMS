
import express from 'express';
import cors from 'cors';
import path from 'path';
import authRoutes from './routes/authRoutes';
import appointmentRoutes from './routes/appointmentRoutes';
import resourceRoutes from './routes/resourceRoutes';
import notificationRoutes from './routes/notificationRoutes'; // New import
import scheduleReminderEmails from './services/reminderService';

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Serve frontend
app.use(express.static(path.join(__dirname, '../../frontend')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/landing.html'));
});

app.use('/api/auth', authRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/notifications', notificationRoutes); // New route

// Schedule the reminder emails
scheduleReminderEmails();

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
