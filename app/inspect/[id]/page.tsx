import { notFound } from 'next/navigation'
import InspectionClient from './client'
import { mockInspection, mockEquipment } from '@/lib/mock-data'

export const dynamic = 'force-dynamic'

async function getOrCreateInspection(equipmentId: string, templateId?: string) {
  // Check if DATABASE_URL exists
  if (!process.env.DATABASE_URL) {
    console.log('Using mock inspection data - DATABASE_URL not configured')
    // Return mock inspection with the requested equipment
    const equipment = mockEquipment.find(e => e.id === equipmentId)
    if (!equipment) {
      return null
    }
    return {
      ...mockInspection,
      equipmentId,
      equipment
    }
  }

  try {
    const { prisma } = await import('@/lib/prisma')
    
    // Check for existing in-progress inspection
    let inspection = await prisma.inspection.findFirst({
      where: {
        equipmentId,
        status: 'IN_PROGRESS',
      },
      include: {
        equipment: true,
        sections: {
          orderBy: { order: 'asc' },
          include: {
            checkpoints: {
              orderBy: { order: 'asc' },
              include: {
                media: true,
              },
            },
          },
        },
      },
    })

    if (inspection) return inspection

    // Get default user
    let user = await prisma.user.findFirst()
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: 'tech@system.local',
          name: 'Field Technician',
        },
      })
    }

  // If template ID is provided, use the template
  let sections = []
  
  if (templateId) {
    const template = await prisma.inspectionTemplate.findUnique({
      where: { id: templateId },
      include: {
        sections: {
          orderBy: { order: 'asc' },
          include: {
            checkpoints: {
              orderBy: { order: 'asc' }
            }
          }
        }
      }
    })
    
    if (template) {
      sections = template.sections.map(section => ({
        name: section.name,
        code: section.code,
        order: section.order,
        checkpoints: section.checkpoints.map(cp => ({
          code: cp.code,
          name: cp.name,
          critical: cp.critical,
          order: cp.order
        }))
      }))
    }
  }
  
  // If no template or template not found, use default sections
  if (sections.length === 0) {
    sections = [
    {
      name: 'Platform & Basket',
      code: 'PB',
      order: 1,
      checkpoints: [
        { code: 'PB-01', name: 'Guard Rails Secure', critical: true, order: 1 },
        { code: 'PB-02', name: 'Gate Functions', critical: true, order: 2 },
        { code: 'PB-03', name: 'Control Panel', critical: false, order: 3 },
        { code: 'PB-04', name: 'Emergency Stop', critical: true, order: 4 },
        { code: 'PB-05', name: 'Floor Condition', critical: false, order: 5 },
      ],
    },
    {
      name: 'Boom & Hydraulics',
      code: 'BH',
      order: 2,
      checkpoints: [
        { code: 'BH-01', name: 'Hydraulic Fluid Level', critical: true, order: 1 },
        { code: 'BH-02', name: 'Cylinder Condition', critical: true, order: 2 },
        { code: 'BH-03', name: 'Hose Inspection', critical: true, order: 3 },
        { code: 'BH-04', name: 'Boom Movement', critical: false, order: 4 },
        { code: 'BH-05', name: 'Load Capacity Label', critical: false, order: 5 },
      ],
    },
    {
      name: 'Base & Chassis',
      code: 'BC',
      order: 3,
      checkpoints: [
        { code: 'BC-01', name: 'Tires/Tracks Condition', critical: true, order: 1 },
        { code: 'BC-02', name: 'Stabilizers/Outriggers', critical: true, order: 2 },
        { code: 'BC-03', name: 'Frame Integrity', critical: true, order: 3 },
        { code: 'BC-04', name: 'Drive Controls', critical: false, order: 4 },
        { code: 'BC-05', name: 'Access Ladder/Steps', critical: false, order: 5 },
      ],
    },
    {
      name: 'Safety Systems',
      code: 'SS',
      order: 4,
      checkpoints: [
        { code: 'SS-01', name: 'Alarm Systems', critical: true, order: 1 },
        { code: 'SS-02', name: 'Limit Switches', critical: true, order: 2 },
        { code: 'SS-03', name: 'Load Sensor', critical: true, order: 3 },
        { code: 'SS-04', name: 'Tilt Sensor', critical: true, order: 4 },
        { code: 'SS-05', name: 'Safety Harness Points', critical: false, order: 5 },
      ],
    },
    {
      name: 'Electrical Systems',
      code: 'ES',
      order: 5,
      checkpoints: [
        { code: 'ES-01', name: 'Battery Condition', critical: true, order: 1 },
        { code: 'ES-02', name: 'Cables & Connections', critical: true, order: 2 },
        { code: 'ES-03', name: 'Control Box', critical: false, order: 3 },
        { code: 'ES-04', name: 'Lights & Beacons', critical: false, order: 4 },
        { code: 'ES-05', name: 'Charging System', critical: false, order: 5 },
      ],
    },
  ]
  }

  inspection = await prisma.inspection.create({
    data: {
      equipmentId,
      technicianId: user.id,
      status: 'IN_PROGRESS',
      sections: {
        create: sections.map(section => ({
          name: section.name,
          code: section.code,
          order: section.order,
          checkpoints: {
            create: section.checkpoints,
          },
        })),
      },
    },
    include: {
      equipment: true,
      sections: {
        orderBy: { order: 'asc' },
        include: {
          checkpoints: {
            orderBy: { order: 'asc' },
            include: {
              media: true,
            },
          },
        },
      },
    },
  })

    return inspection
  } catch (error) {
    console.error('Database connection failed, using mock inspection:', error)
    // Return mock inspection as fallback
    const equipment = mockEquipment.find(e => e.id === equipmentId)
    if (!equipment) {
      return null
    }
    return {
      ...mockInspection,
      equipmentId,
      equipment
    }
  }
}

export default async function InspectPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ template?: string }>
}) {
  const { id } = await params
  const { template: templateId } = await searchParams
  
  // Check if equipment exists (mock or database)
  if (!process.env.DATABASE_URL) {
    const equipment = mockEquipment.find(e => e.id === id)
    if (!equipment) {
      notFound()
    }
  } else {
    try {
      const { prisma } = await import('@/lib/prisma')
      const equipment = await prisma.equipment.findUnique({
        where: { id },
      })
      if (!equipment) {
        notFound()
      }
    } catch (error) {
      // Check mock data as fallback
      const equipment = mockEquipment.find(e => e.id === id)
      if (!equipment) {
        notFound()
      }
    }
  }

  const inspection = await getOrCreateInspection(id, templateId)
  
  if (!inspection) {
    notFound()
  }

  return <InspectionClient inspection={inspection} />
}