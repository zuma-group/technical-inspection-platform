// In-memory storage for mock data when database is not available
// This will persist during the session but will reset on server restart

interface MockEquipment {
  id: string
  type: string
  model: string
  serial: string
  location: string
  status: 'OPERATIONAL' | 'MAINTENANCE' | 'OUT_OF_SERVICE' | 'IN_INSPECTION'
  hoursUsed: number
  createdAt: Date
  updatedAt: Date
  inspections: Array<{
    id: string
    startedAt: Date
    status: string
  }>
}

interface MockTemplate {
  id: string
  name: string
  description?: string
  equipmentType: string
  isDefault: boolean
  parentTemplateId?: string
  createdAt: Date
  updatedAt: Date
  sections: Array<{
    id: string
    name: string
    code: string
    order: number
    templateId?: string
    checkpoints: Array<{
      id: string
      code: string
      name: string
      critical: boolean
      order: number
      sectionId?: string
    }>
  }>
}

// Initialize with default templates
const initialTemplates: MockTemplate[] = [
  {
    id: 'default-boom',
    name: 'Standard Boom Lift Inspection',
    description: 'Comprehensive inspection checklist for boom lifts',
    equipmentType: 'BOOM_LIFT',
    isDefault: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    sections: [
      {
        id: 'sec-1',
        name: 'Platform & Basket',
        code: 'PB',
        order: 1,
        checkpoints: [
          { id: 'cp-1', code: 'PB-01', name: 'Guard Rails Secure', critical: true, order: 1 },
          { id: 'cp-2', code: 'PB-02', name: 'Gate Functions', critical: true, order: 2 },
          { id: 'cp-3', code: 'PB-03', name: 'Control Panel', critical: false, order: 3 },
          { id: 'cp-4', code: 'PB-04', name: 'Emergency Stop', critical: true, order: 4 },
          { id: 'cp-5', code: 'PB-05', name: 'Floor Condition', critical: false, order: 5 },
        ]
      },
      {
        id: 'sec-2',
        name: 'Boom & Hydraulics',
        code: 'BH',
        order: 2,
        checkpoints: [
          { id: 'cp-6', code: 'BH-01', name: 'Hydraulic Fluid Level', critical: true, order: 1 },
          { id: 'cp-7', code: 'BH-02', name: 'Cylinder Condition', critical: true, order: 2 },
          { id: 'cp-8', code: 'BH-03', name: 'Hose Inspection', critical: true, order: 3 },
          { id: 'cp-9', code: 'BH-04', name: 'Boom Movement', critical: false, order: 4 },
        ]
      }
    ]
  },
  {
    id: 'default-scissor',
    name: 'Standard Scissor Lift Inspection',
    description: 'Basic inspection checklist for scissor lifts',
    equipmentType: 'SCISSOR_LIFT',
    isDefault: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    sections: [
      {
        id: 'sec-3',
        name: 'Platform',
        code: 'PL',
        order: 1,
        checkpoints: [
          { id: 'cp-10', code: 'PL-01', name: 'Platform Rails', critical: true, order: 1 },
          { id: 'cp-11', code: 'PL-02', name: 'Entry Gate', critical: true, order: 2 },
          { id: 'cp-12', code: 'PL-03', name: 'Controls', critical: false, order: 3 },
        ]
      },
      {
        id: 'sec-4',
        name: 'Scissor Mechanism',
        code: 'SM',
        order: 2,
        checkpoints: [
          { id: 'cp-13', code: 'SM-01', name: 'Scissor Arms', critical: true, order: 1 },
          { id: 'cp-14', code: 'SM-02', name: 'Pivot Points', critical: true, order: 2 },
        ]
      }
    ]
  }
]

// Use global to persist across hot reloads in development
let mockTemplates: MockTemplate[]

if (typeof global !== 'undefined') {
  if (!global.mockTemplates) {
    global.mockTemplates = [...initialTemplates]
  }
  mockTemplates = global.mockTemplates
} else {
  mockTemplates = [...initialTemplates]
}

export const mockStorage = {
  templates: {
    getAll: () => {
      console.log('Getting all templates, count:', mockTemplates.length)
      return [...mockTemplates]
    },
    
    getById: (id: string) => mockTemplates.find(t => t.id === id),
    
    create: (template: Omit<MockTemplate, 'id' | 'createdAt' | 'updatedAt'>) => {
      const timestamp = Date.now()
      const randomId = Math.random().toString(36).substring(7)
      const newTemplate: MockTemplate = {
        ...template,
        id: `template-${timestamp}-${randomId}`,
        createdAt: new Date(),
        updatedAt: new Date(),
        isDefault: false,
        parentTemplateId: template.parentTemplateId,
        sections: template.sections.map((section, idx) => ({
          ...section,
          id: section.id || `sec-${timestamp}-${idx}`,
          checkpoints: section.checkpoints.map((cp, cpIdx) => ({
            ...cp,
            id: cp.id || `cp-${timestamp}-${idx}-${cpIdx}`
          }))
        }))
      }
      mockTemplates.push(newTemplate)
      console.log('Template created in mock storage:', newTemplate.id, newTemplate.name)
      console.log('Total templates now:', mockTemplates.length)
      return newTemplate
    },
    
    update: (id: string, updates: Partial<MockTemplate>) => {
      const index = mockTemplates.findIndex(t => t.id === id)
      if (index !== -1) {
        mockTemplates[index] = {
          ...mockTemplates[index],
          ...updates,
          updatedAt: new Date()
        }
        return mockTemplates[index]
      }
      return null
    },
    
    delete: (id: string) => {
      const index = mockTemplates.findIndex(t => t.id === id)
      if (index !== -1) {
        mockTemplates.splice(index, 1)
        return true
      }
      return false
    },
    
    addSection: (templateId: string, section: any) => {
      const template = mockTemplates.find(t => t.id === templateId)
      if (template) {
        const newSection = {
          ...section,
          id: `sec-${Date.now()}`,
          templateId,
          checkpoints: []
        }
        template.sections.push(newSection)
        template.updatedAt = new Date()
        return newSection
      }
      return null
    },
    
    updateSection: (sectionId: string, updates: any) => {
      for (const template of mockTemplates) {
        const section = template.sections.find(s => s.id === sectionId)
        if (section) {
          Object.assign(section, updates)
          template.updatedAt = new Date()
          return section
        }
      }
      return null
    },
    
    deleteSection: (sectionId: string) => {
      for (const template of mockTemplates) {
        const index = template.sections.findIndex(s => s.id === sectionId)
        if (index !== -1) {
          template.sections.splice(index, 1)
          template.updatedAt = new Date()
          return true
        }
      }
      return false
    },
    
    addCheckpoint: (sectionId: string, checkpoint: any) => {
      for (const template of mockTemplates) {
        const section = template.sections.find(s => s.id === sectionId)
        if (section) {
          const newCheckpoint = {
            ...checkpoint,
            id: `cp-${Date.now()}`,
            sectionId
          }
          section.checkpoints.push(newCheckpoint)
          template.updatedAt = new Date()
          return newCheckpoint
        }
      }
      return null
    },
    
    updateCheckpoint: (checkpointId: string, updates: any) => {
      for (const template of mockTemplates) {
        for (const section of template.sections) {
          const checkpoint = section.checkpoints.find(cp => cp.id === checkpointId)
          if (checkpoint) {
            Object.assign(checkpoint, updates)
            template.updatedAt = new Date()
            return checkpoint
          }
        }
      }
      return null
    },
    
    deleteCheckpoint: (checkpointId: string) => {
      for (const template of mockTemplates) {
        for (const section of template.sections) {
          const index = section.checkpoints.findIndex(cp => cp.id === checkpointId)
          if (index !== -1) {
            section.checkpoints.splice(index, 1)
            template.updatedAt = new Date()
            return true
          }
        }
      }
      return false
    }
  },
  
  equipment: {
    getAll: () => {
      if (typeof global !== 'undefined') {
        if (!global.mockEquipment) {
          const { mockEquipment } = require('./mock-data')
          global.mockEquipment = [...mockEquipment]
        }
        return [...global.mockEquipment]
      }
      const { mockEquipment } = require('./mock-data')
      return [...mockEquipment]
    },
    
    getById: (id: string) => {
      const equipment = mockStorage.equipment.getAll()
      return equipment.find(e => e.id === id)
    },
    
    create: (equipment: Omit<MockEquipment, 'id' | 'createdAt' | 'updatedAt'>) => {
      const timestamp = Date.now()
      const randomId = Math.random().toString(36).substring(7)
      const newEquipment: MockEquipment = {
        ...equipment,
        id: `eq-${timestamp}-${randomId}`,
        createdAt: new Date(),
        updatedAt: new Date()
      }
      
      if (typeof global !== 'undefined') {
        if (!global.mockEquipment) {
          const { mockEquipment } = require('./mock-data')
          global.mockEquipment = [...mockEquipment]
        }
        global.mockEquipment.push(newEquipment)
      }
      
      console.log('Equipment created in mock storage:', newEquipment.id)
      return newEquipment
    },
    
    update: (id: string, updates: Partial<MockEquipment>) => {
      if (typeof global !== 'undefined') {
        if (!global.mockEquipment) {
          const { mockEquipment } = require('./mock-data')
          global.mockEquipment = [...mockEquipment]
        }
        const index = global.mockEquipment.findIndex(e => e.id === id)
        if (index !== -1) {
          global.mockEquipment[index] = {
            ...global.mockEquipment[index],
            ...updates,
            updatedAt: new Date()
          }
          return global.mockEquipment[index]
        }
      }
      return null
    },
    
    delete: (id: string) => {
      if (typeof global !== 'undefined') {
        if (!global.mockEquipment) {
          const { mockEquipment } = require('./mock-data')
          global.mockEquipment = [...mockEquipment]
        }
        const index = global.mockEquipment.findIndex(e => e.id === id)
        if (index !== -1) {
          global.mockEquipment.splice(index, 1)
          return true
        }
      }
      return false
    }
  }
}