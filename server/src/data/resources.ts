import { Resource } from '../types/express';

export const resources: Resource[] = [
  {
    id: 1,
    name: 'Bed 101',
    type: 'bed',
    isAvailable: true,
  },
  {
    id: 2,
    name: 'Aspirin',
    type: 'medicine',
    quantity: 1000,
  },
  {
    id: 3,
    name: 'Ventilator',
    type: 'equipment',
    isAvailable: false,
  },
];
