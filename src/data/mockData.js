// Mock data for demonstration
export const mockRooms = [
  {
    id: '101',
    patient: {
      name: 'Sarah Johnson',
      age: 67,
      mrn: 'MRN-12345',
      admissionDate: '2024-01-15',
      diagnosis: 'Pneumonia',
      condition: 'Stable',
      riskLevel: 'medium', // low, medium, high, critical
      lastVitals: {
        bp: '128/82',
        heartRate: 78,
        temp: 98.6,
        o2Sat: 96
      },
      medications: ['Amoxicillin', 'Albuterol', 'Prednisone'],
      allergies: ['Penicillin'],
      aiInsights: [
        'Vitals trending stable - continue current treatment plan',
        'O2 saturation improved from 94% to 96% over last 4 hours',
        'Consider reducing monitoring frequency if trend continues'
      ]
    },
    assignedNurse: {
      name: 'Emily Chen',
      expertise: 'Respiratory Care',
      workload: 3
    },
    tasks: [
      { id: 1, time: '09:00', type: 'medication', description: 'Administer Amoxicillin', priority: 'high' },
      { id: 2, time: '10:30', type: 'vitals', description: 'Check vital signs', priority: 'medium' },
      { id: 3, time: '12:00', type: 'assessment', description: 'Respiratory assessment', priority: 'high' }
    ],
    location: { x: 1, y: 1, gridX: 1, gridY: 1 } // gridX, gridY for floor plan grid
  },
  {
    id: '102',
    patient: {
      name: 'Michael Rodriguez',
      age: 45,
      mrn: 'MRN-12346',
      admissionDate: '2024-01-16',
      diagnosis: 'Post-surgical recovery',
      condition: 'Improving',
      riskLevel: 'low',
      lastVitals: {
        bp: '118/75',
        heartRate: 72,
        temp: 98.4,
        o2Sat: 98
      },
      medications: ['Morphine', 'Antibiotics'],
      allergies: ['None'],
      aiInsights: [
        'Recovery progressing well - pain management effective',
        'No signs of infection - wound healing normally',
        'Patient may be ready for discharge planning in 24-48 hours'
      ]
    },
    assignedNurse: {
      name: 'James Wilson',
      expertise: 'Surgical Care',
      workload: 2
    },
    tasks: [
      { id: 4, time: '09:15', type: 'medication', description: 'Pain medication', priority: 'medium' },
      { id: 5, time: '11:00', type: 'assessment', description: 'Wound check', priority: 'high' }
    ],
    location: { x: 1, y: 1, gridX: 3, gridY: 1 }
  },
  {
    id: '103',
    patient: {
      name: 'Patricia Williams',
      age: 82,
      mrn: 'MRN-12347',
      admissionDate: '2024-01-14',
      diagnosis: 'Heart failure',
      condition: 'Critical',
      riskLevel: 'critical',
      lastVitals: {
        bp: '95/60',
        heartRate: 105,
        temp: 99.2,
        o2Sat: 91
      },
      medications: ['Furosemide', 'Digoxin', 'ACE inhibitor'],
      allergies: ['Sulfa drugs'],
      aiInsights: [
        '⚠️ Elevated heart rate and low BP - requires immediate attention',
        'O2 saturation below target - consider oxygen therapy adjustment',
        'Fluid balance monitoring critical - check I&O every 2 hours'
      ]
    },
    assignedNurse: {
      name: 'Emily Chen',
      expertise: 'Cardiac Care',
      workload: 3
    },
    tasks: [
      { id: 6, time: '08:45', type: 'medication', description: 'Furosemide - urgent', priority: 'critical' },
      { id: 7, time: '09:30', type: 'vitals', description: 'Continuous monitoring', priority: 'critical' },
      { id: 8, time: '10:00', type: 'assessment', description: 'Cardiac assessment', priority: 'critical' }
    ],
    location: { x: 1, y: 1, gridX: 5, gridY: 1 }
  },
  {
    id: '104',
    patient: {
      name: 'Robert Brown',
      age: 58,
      mrn: 'MRN-12348',
      admissionDate: '2024-01-16',
      diagnosis: 'Diabetes management',
      condition: 'Stable',
      riskLevel: 'medium',
      lastVitals: {
        bp: '132/88',
        heartRate: 82,
        temp: 98.8,
        o2Sat: 97
      },
      medications: ['Insulin', 'Metformin'],
      allergies: ['None'],
      aiInsights: [
        'Blood glucose levels well-controlled with current regimen',
        'No signs of complications - continue monitoring',
        'Patient education on diet management completed'
      ]
    },
    assignedNurse: {
      name: 'Lisa Anderson',
      expertise: 'Endocrinology',
      workload: 4
    },
    tasks: [
      { id: 9, time: '09:30', type: 'medication', description: 'Insulin administration', priority: 'high' },
      { id: 10, time: '11:30', type: 'assessment', description: 'Blood glucose check', priority: 'high' }
    ],
    location: { x: 1, y: 1, gridX: 1, gridY: 3 }
  },
  {
    id: '105',
    patient: {
      name: 'Jennifer Davis',
      age: 34,
      mrn: 'MRN-12349',
      admissionDate: '2024-01-17',
      diagnosis: 'Appendicitis recovery',
      condition: 'Good',
      riskLevel: 'low',
      lastVitals: {
        bp: '122/78',
        heartRate: 68,
        temp: 98.2,
        o2Sat: 99
      },
      medications: ['Antibiotics', 'Pain management'],
      allergies: ['Codeine'],
      aiInsights: [
        'Recovery on track - no complications observed',
        'Pain well-managed with alternative medications',
        'Patient may be ready for discharge today'
      ]
    },
    assignedNurse: {
      name: 'James Wilson',
      expertise: 'Surgical Care',
      workload: 2
    },
    tasks: [
      { id: 11, time: '10:00', type: 'medication', description: 'Antibiotic dose', priority: 'medium' },
      { id: 12, time: '12:00', type: 'assessment', description: 'Discharge assessment', priority: 'medium' }
    ],
    location: { x: 1, y: 1, gridX: 3, gridY: 3 }
  },
  {
    id: '106',
    patient: {
      name: 'David Martinez',
      age: 71,
      mrn: 'MRN-12350',
      admissionDate: '2024-01-15',
      diagnosis: 'Stroke recovery',
      condition: 'Stable',
      riskLevel: 'high',
      lastVitals: {
        bp: '145/92',
        heartRate: 88,
        temp: 98.9,
        o2Sat: 95
      },
      medications: ['Aspirin', 'Blood pressure meds', 'Anticoagulant'],
      allergies: ['None'],
      aiInsights: [
        'BP slightly elevated - monitor closely',
        'Neurological status stable - continue rehabilitation',
        'Fall risk assessment updated - patient requires assistance'
      ]
    },
    assignedNurse: {
      name: 'Lisa Anderson',
      expertise: 'Neurology',
      workload: 4
    },
    tasks: [
      { id: 13, time: '09:00', type: 'medication', description: 'Morning medications', priority: 'high' },
      { id: 14, time: '10:30', type: 'assessment', description: 'Neurological check', priority: 'high' },
      { id: 15, time: '11:00', type: 'therapy', description: 'Physical therapy session', priority: 'medium' }
    ],
    location: { x: 1, y: 1, gridX: 5, gridY: 3 }
  }
];

export const mockNurses = [
  {
    id: 1,
    name: 'Emily Chen',
    expertise: ['Respiratory Care', 'Cardiac Care'],
    currentWorkload: 6,
    maxWorkload: 8,
    efficiency: 95
  },
  {
    id: 2,
    name: 'James Wilson',
    expertise: ['Surgical Care'],
    currentWorkload: 4,
    maxWorkload: 8,
    efficiency: 92
  },
  {
    id: 3,
    name: 'Lisa Anderson',
    expertise: ['Endocrinology', 'Neurology'],
    currentWorkload: 8,
    maxWorkload: 8,
    efficiency: 88
  }
];

export const getAllTasks = () => {
  const allTasks = [];
  mockRooms.forEach(room => {
    room.tasks.forEach(task => {
      allTasks.push({
        ...task,
        roomId: room.id,
        patientName: room.patient.name
      });
    });
  });
  return allTasks.sort((a, b) => a.time.localeCompare(b.time));
};

