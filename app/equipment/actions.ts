'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { EquipmentType, EquipmentStatus } from '@prisma/client'

export async function createEquipment(data: {
  model: string
  type: string
  serial: string
  location: string
  hoursUsed: number
  status: string
}) {
  try {
    // Validate and convert type
    const equipmentType = data.type.toUpperCase().replace(' ', '_') as EquipmentType
    if (!Object.values(EquipmentType).includes(equipmentType)) {
      throw new Error(`Invalid equipment type: ${data.type}`)
    }

    // Validate and convert status
    const equipmentStatus = data.status as EquipmentStatus
    if (!Object.values(EquipmentStatus).includes(equipmentStatus)) {
      throw new Error(`Invalid equipment status: ${data.status}`)
    }

    const equipment = await prisma.equipment.create({
      data: {
        model: data.model,
        type: equipmentType,
        serial: data.serial,
        location: data.location,
        hoursUsed: data.hoursUsed,
        status: equipmentStatus
      }
    })
    
    revalidatePath('/')
    return { success: true, data: equipment }
  } catch (error) {
    console.error('Failed to create equipment:', error)
    
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
  status: string
}>) {
  try {
    const updateData: any = {}
    
    // Validate and add fields only if they are provided
    if (data.model !== undefined) updateData.model = data.model
    if (data.serial !== undefined) updateData.serial = data.serial
    if (data.location !== undefined) updateData.location = data.location
    if (data.hoursUsed !== undefined) updateData.hoursUsed = data.hoursUsed
    
    if (data.type !== undefined) {
      const equipmentType = data.type.toUpperCase().replace(' ', '_') as EquipmentType
      if (!Object.values(EquipmentType).includes(equipmentType)) {
        throw new Error(`Invalid equipment type: ${data.type}`)
      }
      updateData.type = equipmentType
    }
    
    if (data.status !== undefined) {
      const equipmentStatus = data.status as EquipmentStatus
      if (!Object.values(EquipmentStatus).includes(equipmentStatus)) {
        throw new Error(`Invalid equipment status: ${data.status}`)
      }
      updateData.status = equipmentStatus
    }

    const equipment = await prisma.equipment.update({
      where: { id },
      data: updateData
    })
    
    revalidatePath('/')
    revalidatePath(`/equipment/${id}`)
    return { success: true, data: equipment }
  } catch (error) {
    console.error('Failed to update equipment:', error)
    
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
    console.error('Failed to delete equipment:', error)
    
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