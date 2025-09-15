import { notFound } from 'next/navigation'
import InspectionClient from './client'
import { prisma } from '@/lib/prisma'
import { InspectionStatus } from '@prisma/client'

export const dynamic = 'force-dynamic'

async function getOrCreateInspection(
  equipmentId: string, 
  templateId?: string,
  taskId?: string,
  serialNumber?: string
) {
  try {
    // Check if equipment exists
    const equipment = await prisma.equipment.findUnique({
      where: { id: equipmentId }
    })

    if (!equipment) {
      return null
    }

    // Check for existing in-progress inspection
    let inspection = await prisma.inspection.findFirst({
      where: {
        equipmentId,
        status: InspectionStatus.IN_PROGRESS,
      },
      include: {
        equipment: true,
        sections: {
          orderBy: { order: 'asc' },
          include: {
            checkpoints: {
              orderBy: { order: 'asc' },
              include: {
                media: {
                  select: {
                    id: true,
                    type: true,
                    filename: true,
                    mimeType: true,
                    size: true,
                    createdAt: true
                  }
                },
              },
            },
          },
        },
      },
    })

    if (inspection) return inspection

    // Get or create default user (temporary until auth is implemented)
    let user = await prisma.user.findFirst()
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: 'tech@system.local',
          name: 'Field Technician',
          role: 'TECHNICIAN'
        },
      })
    }

    // Get template sections
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
          order: section.order,
          checkpoints: section.checkpoints.map(cp => ({
            name: cp.name,
            critical: cp.critical,
            order: cp.order
          }))
        }))
      }
    }
    
    // If no template, try to find default template for equipment type
    if (sections.length === 0) {
      const defaultTemplate = await prisma.inspectionTemplate.findFirst({
        where: {
          equipmentType: equipment.type,
          isDefault: true
        },
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

      if (defaultTemplate) {
        sections = defaultTemplate.sections.map(section => ({
          name: section.name,
          order: section.order,
          checkpoints: section.checkpoints.map(cp => ({
            name: cp.name,
            critical: cp.critical,
            order: cp.order
          }))
        }))
      }
    }
    
    // If still no sections, create basic inspection structure
    if (sections.length === 0) {
      sections = [
        {
          name: 'General Inspection',
          order: 1,
          checkpoints: [
            { name: 'Visual Inspection', critical: false, order: 1 },
            { name: 'Safety Features', critical: true, order: 2 },
            { name: 'Operating Controls', critical: true, order: 3 },
            { name: 'Documentation', critical: false, order: 4 },
          ],
        }
      ]
    }

    // Create new inspection
    inspection = await prisma.inspection.create({
      data: {
        equipmentId,
        technicianId: user.id,
        templateId: templateId || null,
        taskId: taskId || null,
        serialNumber: serialNumber || null,
        status: InspectionStatus.IN_PROGRESS,
        sections: {
          create: sections.map(section => ({
            name: section.name,
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
                media: {
                  select: {
                    id: true,
                    type: true,
                    filename: true,
                    mimeType: true,
                    size: true,
                    createdAt: true
                  }
                },
              },
            },
          },
        },
      },
    })

    return inspection
  } catch (error) {
    console.error('Failed to get or create inspection:', error)
    return null
  }
}

export default async function InspectPage({ 
  params,
  searchParams
}: { 
  params: Promise<{ id: string }>
  searchParams: Promise<{ template?: string; taskId?: string; serialNumber?: string; create?: string }>
}) {
  const { id } = await params
  const { template, taskId, serialNumber, create } = await searchParams
  
  // Only create inspection if explicitly requested or if template is provided
  const shouldCreate = create === 'true' || !!template
  
  let inspection
  if (shouldCreate) {
    inspection = await getOrCreateInspection(id, template, taskId, serialNumber)
  } else {
    // Just get existing inspection, don't create
    inspection = await prisma.inspection.findFirst({
      where: {
        equipmentId: id,
        status: InspectionStatus.IN_PROGRESS,
      },
      include: {
        equipment: true,
        sections: {
          orderBy: { order: 'asc' },
          include: {
            checkpoints: {
              orderBy: { order: 'asc' },
              include: {
                media: {
                  select: {
                    id: true,
                    type: true,
                    filename: true,
                    mimeType: true,
                    size: true,
                    createdAt: true
                  }
                },
              },
            },
          },
        },
      },
    })
  }

  if (!inspection) {
    notFound()
  }

  return <InspectionClient inspection={inspection} />
}