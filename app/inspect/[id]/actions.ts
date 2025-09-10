'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function updateCheckpoint(
  checkpointId: string, 
  status: string,
  notes?: string,
  estimatedHours?: number
) {
  await prisma.checkpoint.update({
    where: { id: checkpointId },
    data: { 
      status,
      notes,
      estimatedHours 
    },
  })
  revalidatePath('/inspect/[id]')
}

export async function completeInspection(inspectionId: string) {
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
}