'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'

export async function createEquipment(data: {
  model: string
  type: string
  serial: string
  location: string
  hoursUsed: number
  taskId?: string
}) {
  try {
    // Validate and convert type without relying on generated Prisma enums at lint time
    const EQUIPMENT_TYPES = ['BOOM_LIFT','SCISSOR_LIFT','TELEHANDLER','FORKLIFT','OTHER'] as const
    const equipmentType = data.type.toUpperCase().replace(' ', '_')
    if (!EQUIPMENT_TYPES.includes(equipmentType as any)) {
      throw new Error(`Invalid equipment type: ${data.type}`)
    }

    const equipment = await prisma.equipment.create({
      data: {
        model: data.model,
        type: equipmentType as any,
        serial: data.serial,
        location: data.location,
        hoursUsed: data.hoursUsed,
        taskId: data.taskId
      } as any
    })
    
    revalidatePath('/')
    return { success: true, data: equipment }
  } catch (error) {
    console.error('Failed to create equipment:', error instanceof Error ? error.message : String(error))
    
    // Check for unique constraint violation
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return { 
        success: false, 
        error: 'Equipment with this serial number already exists' 
      }
    }
    
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to create equipment' 
    }
  }
}

export async function updateEquipment(id: string, data: Partial<{
  model: string
  type: string
  serial: string
  location: string
  hoursUsed: number
  taskId: string
}>) {
  try {
    const updateData: Record<string, any> = {}
    
    // Validate and add fields only if they are provided
    if (data.model !== undefined) updateData.model = data.model
    if (data.serial !== undefined) updateData.serial = data.serial
    if (data.location !== undefined) updateData.location = data.location
    if (data.hoursUsed !== undefined) updateData.hoursUsed = data.hoursUsed
    if (data.taskId !== undefined) updateData.taskId = data.taskId
    
    if (data.type !== undefined) {
      const EQUIPMENT_TYPES = ['BOOM_LIFT','SCISSOR_LIFT','TELEHANDLER','FORKLIFT','OTHER'] as const
      const equipmentType = data.type.toUpperCase().replace(' ', '_')
      if (!EQUIPMENT_TYPES.includes(equipmentType as any)) {
        throw new Error(`Invalid equipment type: ${data.type}`)
      }
      updateData.type = equipmentType as any
    }

    const equipment = await prisma.equipment.update({
      where: { id },
      data: updateData as any
    })
    
    revalidatePath('/')
    revalidatePath(`/equipment/${id}`)
    return { success: true, data: equipment }
  } catch (error) {
    console.error('Failed to update equipment:', error instanceof Error ? error.message : String(error))
    
    if (error instanceof Error && error.message.includes('Record to update not found')) {
      return { 
        success: false, 
        error: 'Equipment not found' 
      }
    }
    
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to update equipment' 
    }
  }
}

export async function deleteEquipment(id: string) {
  try {
    await prisma.equipment.delete({
      where: { id }
    })
    
    revalidatePath('/')
    return { success: true }
  } catch (error) {
    console.error('Failed to delete equipment:', error instanceof Error ? error.message : String(error))
    
    if (error instanceof Error && error.message.includes('Record to delete does not exist')) {
      return { 
        success: false, 
        error: 'Equipment not found' 
      }
    }
    
    return { 
      success: false, 
      error: 'Failed to delete equipment. It may have associated inspections.' 
    }
  }
}