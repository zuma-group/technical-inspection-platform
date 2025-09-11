'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { CheckpointStatus, InspectionStatus, EquipmentStatus } from '@prisma/client'

export async function updateCheckpoint(
  checkpointId: string, 
  status: string,
  notes?: string,
  estimatedHours?: number
) {
  try {
    // Validate status
    const checkpointStatus = status as CheckpointStatus
    if (!Object.values(CheckpointStatus).includes(checkpointStatus)) {
      throw new Error(`Invalid checkpoint status: ${status}`)
    }

    await prisma.checkpoint.update({
      where: { id: checkpointId },
      data: { 
        status: checkpointStatus,
        notes: notes || null,
        estimatedHours: estimatedHours || null
      },
    })
    
    revalidatePath('/inspect/[id]', 'page')
    return { success: true }
  } catch (error) {
    console.error('Failed to update checkpoint:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to update checkpoint' 
    }
  }
}

export async function stopInspection(inspectionId: string) {
  try {
    // Delete the inspection and all related data (cascading delete will handle sections, checkpoints, media)
    await prisma.inspection.delete({
      where: { id: inspectionId }
    })
    
    revalidatePath('/')
    revalidatePath('/inspect/[id]', 'page')
    return { success: true }
  } catch (error) {
    console.error('Failed to stop inspection:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to stop inspection' 
    }
  }
}

export async function completeInspection(inspectionId: string) {
  try {
    // First, get the inspection with all checkpoints
    const inspection = await prisma.inspection.findUnique({
      where: { id: inspectionId },
      include: {
        equipment: true,
        sections: {
          include: {
            checkpoints: true
          }
        }
      }
    })

    if (!inspection) {
      throw new Error('Inspection not found')
    }

    // Flatten all checkpoints
    const allCheckpoints = inspection.sections.flatMap(section => section.checkpoints)
    
    // Check for issues
    const hasActionRequired = allCheckpoints.some(cp => cp.status === CheckpointStatus.ACTION_REQUIRED)
    const hasCriticalIssues = allCheckpoints.some(cp => cp.critical && cp.status === CheckpointStatus.ACTION_REQUIRED)
    
    // Determine equipment status
    let equipmentStatus: EquipmentStatus = EquipmentStatus.OPERATIONAL
    if (hasCriticalIssues) {
      equipmentStatus = EquipmentStatus.OUT_OF_SERVICE
    } else if (hasActionRequired) {
      equipmentStatus = EquipmentStatus.MAINTENANCE
    }

    // Use a transaction to ensure both updates succeed or fail together
    await prisma.$transaction([
      // Update inspection status
      prisma.inspection.update({
        where: { id: inspectionId },
        data: {
          status: InspectionStatus.COMPLETED,
          completedAt: new Date(),
        }
      }),
      // Update equipment status
      prisma.equipment.update({
        where: { id: inspection.equipmentId },
        data: { status: equipmentStatus }
      })
    ])
    
    revalidatePath('/')
    revalidatePath('/dashboard')
    return { success: true, equipmentStatus }
  } catch (error) {
    console.error('Failed to complete inspection:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to complete inspection' 
    }
  }
}

export async function createInspection(equipmentId: string, technicianId: string, templateId?: string) {
  try {
    // Check if there's already an in-progress inspection
    const existingInspection = await prisma.inspection.findFirst({
      where: {
        equipmentId,
        status: InspectionStatus.IN_PROGRESS
      }
    })

    if (existingInspection) {
      return { success: true, data: existingInspection }
    }

    // Get template if specified, otherwise get default template for equipment type
    let template = null
    if (templateId) {
      template = await prisma.inspectionTemplate.findUnique({
        where: { id: templateId },
        include: {
          sections: {
            include: {
              checkpoints: true
            }
          }
        }
      })
    } else {
      // Get equipment type and find default template
      const equipment = await prisma.equipment.findUnique({
        where: { id: equipmentId }
      })
      
      if (equipment) {
        template = await prisma.inspectionTemplate.findFirst({
          where: {
            equipmentType: equipment.type,
            isDefault: true
          },
          include: {
            sections: {
              include: {
                checkpoints: true
              }
            }
          }
        })
      }
    }

    if (!template) {
      throw new Error('No inspection template found')
    }

    // Create new inspection with sections and checkpoints from template
    const inspection = await prisma.inspection.create({
      data: {
        equipmentId,
        technicianId,
        templateId: template.id,
        status: InspectionStatus.IN_PROGRESS,
        sections: {
          create: template.sections.map(section => ({
            name: section.name,
            code: section.code,
            order: section.order,
            checkpoints: {
              create: section.checkpoints.map(checkpoint => ({
                code: checkpoint.code,
                name: checkpoint.name,
                critical: checkpoint.critical,
                order: checkpoint.order,
                status: null,
                notes: null,
                estimatedHours: null
              }))
            }
          }))
        }
      },
      include: {
        sections: {
          include: {
            checkpoints: true
          }
        }
      }
    })

    revalidatePath('/')
    return { success: true, data: inspection }
  } catch (error) {
    console.error('Failed to create inspection:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to create inspection' 
    }
  }
}