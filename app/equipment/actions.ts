'use server'

import { revalidatePath } from 'next/cache'
import { mockStorage } from '@/lib/mock-storage'

export async function createEquipment(data: {
  model: string
  type: string
  serial: string
  location: string
  hoursUsed: number
  status: string
}) {
  // Check if database is available
  if (!process.env.DATABASE_URL) {
    // Use mock storage
    const newEquipment = mockStorage.equipment.create({
      model: data.model,
      type: data.type,
      serial: data.serial,
      location: data.location,
      hoursUsed: data.hoursUsed,
      status: data.status as 'OPERATIONAL' | 'MAINTENANCE' | 'OUT_OF_SERVICE',
      inspections: []
    })
    
    console.log('Equipment created in mock storage:', newEquipment.id)
    revalidatePath('/')
    return newEquipment
  }

  try {
    const { prisma } = await import('@/lib/prisma')
    const equipment = await prisma.equipment.create({
      data: {
        model: data.model,
        type: data.type,
        serial: data.serial,
        location: data.location,
        hoursUsed: data.hoursUsed,
        status: data.status
      }
    })
    
    revalidatePath('/')
    return equipment
  } catch (error) {
    console.error('Failed to create equipment:', error)
    
    // Fallback to mock storage on error
    const newEquipment = mockStorage.equipment.create({
      model: data.model,
      type: data.type,
      serial: data.serial,
      location: data.location,
      hoursUsed: data.hoursUsed,
      status: data.status as 'OPERATIONAL' | 'MAINTENANCE' | 'OUT_OF_SERVICE',
      inspections: []
    })
    
    revalidatePath('/')
    return newEquipment
  }
}

export async function updateEquipment(id: string, data: Partial<{
  model: string
  type: string
  serial: string
  location: string
  hoursUsed: number
  status: 'OPERATIONAL' | 'MAINTENANCE' | 'OUT_OF_SERVICE' | 'IN_INSPECTION'
}>) {
  if (!process.env.DATABASE_URL) {
    const updated = mockStorage.equipment.update(id, data as any)
    revalidatePath('/')
    revalidatePath(`/equipment/${id}`)
    return updated
  }

  try {
    const { prisma } = await import('@/lib/prisma')
    const equipment = await prisma.equipment.update({
      where: { id },
      data
    })
    
    revalidatePath('/')
    revalidatePath(`/equipment/${id}`)
    return equipment
  } catch (error) {
    console.error('Failed to update equipment:', error)
    const updated = mockStorage.equipment.update(id, data as any)
    revalidatePath('/')
    revalidatePath(`/equipment/${id}`)
    return updated
  }
}

export async function deleteEquipment(id: string) {
  if (!process.env.DATABASE_URL) {
    const deleted = mockStorage.equipment.delete(id)
    revalidatePath('/')
    return deleted
  }

  try {
    const { prisma } = await import('@/lib/prisma')
    await prisma.equipment.delete({
      where: { id }
    })
    
    revalidatePath('/')
    return true
  } catch (error) {
    console.error('Failed to delete equipment:', error)
    const deleted = mockStorage.equipment.delete(id)
    revalidatePath('/')
    return deleted
  }
}