import { Appointment } from '../types/express';

export const appointments: Appointment[] = [
  {
    id: 1,
    patientId: 1,
    doctorId: 2,
    date: '2025-10-10T10:00:00Z',
    description: 'Annual Checkup',
  },
  {
    id: 2,
    patientId: 1,
    doctorId: 2,
    date: '2025-11-12T14:30:00Z',
    description: 'Follow-up',
  },
];
