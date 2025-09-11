'use server'

import { revalidatePath } from 'next/cache'

export async function updateCheckpoint(
  checkpointId: string, 
  status: string,
  notes?: string,
  estimatedHours?: number
) {
  // Check if DATABASE_URL exists
  if (!process.env.DATABASE_URL) {
    console.log('Mock mode: Checkpoint update simulated', { checkpointId, status, notes, estimatedHours })
    revalidatePath('/inspect/[id]')
    return
  }

  try {
    const { prisma } = await import('@/lib/prisma')
    await prisma.checkpoint.update({
      where: { id: checkpointId },
      data: { 
        status,
        notes,
        estimatedHours 
      },
    })
    revalidatePath('/inspect/[id]')
  } catch (error) {
    console.error('Failed to update checkpoint:', error)
    revalidatePath('/inspect/[id]')
  }
}

export async function stopInspection(inspectionId: string) {
  // Check if DATABASE_URL exists
  if (!process.env.DATABASE_URL) {
    console.log('Mock mode: Inspection stop simulated', { inspectionId })
    revalidatePath('/')
    revalidatePath('/inspect/[id]')
    return { success: true }
  }

  try {
    const { prisma } = await import('@/lib/prisma')
    
    // Delete the inspection and all related data (cascading delete will handle sections, checkpoints, media)
    await prisma.inspection.delete({
      where: { id: inspectionId }
    })
    
    revalidatePath('/')
    revalidatePath('/inspect/[id]')
    return { success: true }
  } catch (error) {
    console.error('Failed to stop inspection:', error)
    return { success: false, error: 'Failed to stop inspection' }
  }
}

export async function completeInspection(inspectionId: string) {
  // Check if DATABASE_URL exists
  if (!process.env.DATABASE_URL) {
    console.log('Mock mode: Inspection completion simulated', { inspectionId })
    revalidatePath('/')
    return
  }

  try {
    const { prisma } = await import('@/lib/prisma')
    
    const inspection = await prisma.inspection.update({
      where: { id: inspectionId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
      },
      include: {
        equipment: true,
      },
    })
    
    // Update equipment status based on inspection results
    const checkpoints = await prisma.checkpoint.findMany({
      where: {
        section: {
          inspectionId,
        },
      },
    })
    
    const hasActionRequired = checkpoints.some(cp => cp.status === 'ACTION_REQUIRED')
    const hasCriticalIssues = checkpoints.some(cp => cp.critical && cp.status === 'ACTION_REQUIRED')
    
    let equipmentStatus = 'OPERATIONAL'
    if (hasCriticalIssues) {
      equipmentStatus = 'OUT_OF_SERVICE'
    } else if (hasActionRequired) {
      equipmentStatus = 'MAINTENANCE'
    }
    
    await prisma.equipment.update({
      where: { id: inspection.equipmentId },
      data: { status: equipmentStatus },
    })
    
    revalidatePath('/')
  } catch (error) {
    console.error('Failed to complete inspection:', error)
    revalidatePath('/')
  }
}