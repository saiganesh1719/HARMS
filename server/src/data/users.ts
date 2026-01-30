import { User } from '../types/express';

export const users: User[] = [
  {
    id: 1,
    username: 'patient1',
    password: 'password', // In a real app, use hashed passwords
    role: 'Patient',
  },
  {
    id: 2,
    username: 'doctor1',
    password: 'password',
    role: 'Doctor',
  },
  {
    id: 3,
    username: 'admin1',
    password: 'password',
    role: 'Admin',
  },
];
