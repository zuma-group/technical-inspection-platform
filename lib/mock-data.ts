// Mock data for demo/development when database is not available

export const mockEquipment = [
  {
    id: '1',
    type: 'BOOM_LIFT',
    model: 'JLG 600S',
    serial: 'BL-2024-001',
    location: 'Site A - North Zone',
    status: 'OPERATIONAL',
    hoursUsed: 1234,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-03-20'),
    inspections: [
      { id: 'insp-1', startedAt: new Date('2024-03-15'), status: 'COMPLETED' }
    ]
  },
  {
    id: '2',
    type: 'SCISSOR_LIFT',
    model: 'Genie GS-1930',
    serial: 'SL-2024-002',
    location: 'Site B - East Wing',
    status: 'MAINTENANCE',
    hoursUsed: 892,
    createdAt: new Date('2024-01-20'),
    updatedAt: new Date('2024-03-18'),
    inspections: [
      { id: 'insp-2', startedAt: new Date('2024-03-10'), status: 'COMPLETED' }
    ]
  },
  {
    id: '3',
    type: 'TELEHANDLER',
    model: 'CAT TH514D',
    serial: 'TH-2024-003',
    location: 'Site A - South Zone',
    status: 'IN_INSPECTION',
    hoursUsed: 2156,
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-03-21'),
    inspections: []
  },
  {
    id: '4',
    type: 'BOOM_LIFT',
    model: 'Snorkel A62JRT',
    serial: 'BL-2024-004',
    location: 'Site C - Main Area',
    status: 'OUT_OF_SERVICE',
    hoursUsed: 3421,
    createdAt: new Date('2024-02-10'),
    updatedAt: new Date('2024-03-19'),
    inspections: [
      { id: 'insp-4', startedAt: new Date('2024-03-01'), status: 'COMPLETED' }
    ]
  }
]

export const mockInspection = {
  id: 'demo-inspection',
  equipmentId: '1',
  technicianId: 'demo-tech',
  status: 'IN_PROGRESS',
  startedAt: new Date(),
  equipment: mockEquipment[0],
  sections: [
    {
      id: 'sec-1',
      name: 'Platform & Basket',
      code: 'PB',
      order: 1,
      inspectionId: 'demo-inspection',
      checkpoints: [
        { id: 'cp-1', code: 'PB-01', name: 'Guard Rails Secure', critical: true, order: 1, status: null, notes: null, estimatedHours: null, sectionId: 'sec-1', media: [] },
        { id: 'cp-2', code: 'PB-02', name: 'Gate Functions', critical: true, order: 2, status: null, notes: null, estimatedHours: null, sectionId: 'sec-1', media: [] },
        { id: 'cp-3', code: 'PB-03', name: 'Control Panel', critical: false, order: 3, status: null, notes: null, estimatedHours: null, sectionId: 'sec-1', media: [] },
        { id: 'cp-4', code: 'PB-04', name: 'Emergency Stop', critical: true, order: 4, status: null, notes: null, estimatedHours: null, sectionId: 'sec-1', media: [] },
        { id: 'cp-5', code: 'PB-05', name: 'Floor Condition', critical: false, order: 5, status: null, notes: null, estimatedHours: null, sectionId: 'sec-1', media: [] },
      ]
    },
    {
      id: 'sec-2',
      name: 'Boom & Hydraulics',
      code: 'BH',
      order: 2,
      inspectionId: 'demo-inspection',
      checkpoints: [
        { id: 'cp-6', code: 'BH-01', name: 'Hydraulic Fluid Level', critical: true, order: 1, status: null, notes: null, estimatedHours: null, sectionId: 'sec-2', media: [] },
        { id: 'cp-7', code: 'BH-02', name: 'Cylinder Condition', critical: true, order: 2, status: null, notes: null, estimatedHours: null, sectionId: 'sec-2', media: [] },
        { id: 'cp-8', code: 'BH-03', name: 'Hose Inspection', critical: true, order: 3, status: null, notes: null, estimatedHours: null, sectionId: 'sec-2', media: [] },
        { id: 'cp-9', code: 'BH-04', name: 'Boom Movement', critical: false, order: 4, status: null, notes: null, estimatedHours: null, sectionId: 'sec-2', media: [] },
        { id: 'cp-10', code: 'BH-05', name: 'Load Capacity Label', critical: false, order: 5, status: null, notes: null, estimatedHours: null, sectionId: 'sec-2', media: [] },
      ]
    },
    {
      id: 'sec-3',
      name: 'Base & Chassis',
      code: 'BC',
      order: 3,
      inspectionId: 'demo-inspection',
      checkpoints: [
        { id: 'cp-11', code: 'BC-01', name: 'Tires/Tracks Condition', critical: true, order: 1, status: null, notes: null, estimatedHours: null, sectionId: 'sec-3', media: [] },
        { id: 'cp-12', code: 'BC-02', name: 'Stabilizers/Outriggers', critical: true, order: 2, status: null, notes: null, estimatedHours: null, sectionId: 'sec-3', media: [] },
        { id: 'cp-13', code: 'BC-03', name: 'Frame Integrity', critical: true, order: 3, status: null, notes: null, estimatedHours: null, sectionId: 'sec-3', media: [] },
        { id: 'cp-14', code: 'BC-04', name: 'Drive Controls', critical: false, order: 4, status: null, notes: null, estimatedHours: null, sectionId: 'sec-3', media: [] },
        { id: 'cp-15', code: 'BC-05', name: 'Access Ladder/Steps', critical: false, order: 5, status: null, notes: null, estimatedHours: null, sectionId: 'sec-3', media: [] },
      ]
    },
    {
      id: 'sec-4',
      name: 'Safety Systems',
      code: 'SS',
      order: 4,
      inspectionId: 'demo-inspection',
      checkpoints: [
        { id: 'cp-16', code: 'SS-01', name: 'Alarm Systems', critical: true, order: 1, status: null, notes: null, estimatedHours: null, sectionId: 'sec-4', media: [] },
        { id: 'cp-17', code: 'SS-02', name: 'Limit Switches', critical: true, order: 2, status: null, notes: null, estimatedHours: null, sectionId: 'sec-4', media: [] },
        { id: 'cp-18', code: 'SS-03', name: 'Load Sensor', critical: true, order: 3, status: null, notes: null, estimatedHours: null, sectionId: 'sec-4', media: [] },
        { id: 'cp-19', code: 'SS-04', name: 'Tilt Sensor', critical: true, order: 4, status: null, notes: null, estimatedHours: null, sectionId: 'sec-4', media: [] },
        { id: 'cp-20', code: 'SS-05', name: 'Safety Harness Points', critical: false, order: 5, status: null, notes: null, estimatedHours: null, sectionId: 'sec-4', media: [] },
      ]
    },
    {
      id: 'sec-5',
      name: 'Electrical Systems',
      code: 'ES',
      order: 5,
      inspectionId: 'demo-inspection',
      checkpoints: [
        { id: 'cp-21', code: 'ES-01', name: 'Battery Condition', critical: true, order: 1, status: null, notes: null, estimatedHours: null, sectionId: 'sec-5', media: [] },
        { id: 'cp-22', code: 'ES-02', name: 'Cables & Connections', critical: true, order: 2, status: null, notes: null, estimatedHours: null, sectionId: 'sec-5', media: [] },
        { id: 'cp-23', code: 'ES-03', name: 'Control Box', critical: false, order: 3, status: null, notes: null, estimatedHours: null, sectionId: 'sec-5', media: [] },
        { id: 'cp-24', code: 'ES-04', name: 'Lights & Beacons', critical: false, order: 4, status: null, notes: null, estimatedHours: null, sectionId: 'sec-5', media: [] },
        { id: 'cp-25', code: 'ES-05', name: 'Charging System', critical: false, order: 5, status: null, notes: null, estimatedHours: null, sectionId: 'sec-5', media: [] },
      ]
    }
  ]
}