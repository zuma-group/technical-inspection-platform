'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { EquipmentType } from '@prisma/client'

export async function getTemplates() {
  try {
    const templates = await prisma.inspectionTemplate.findMany({
      include: {
        sections: {
          orderBy: { order: 'asc' },
          include: {
            checkpoints: {
              orderBy: { order: 'asc' }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
    
    return templates
  } catch (error) {
    console.error('Failed to fetch templates:', error)
    return []
  }
}

export async function getTemplate(id: string) {
  try {
    return await prisma.inspectionTemplate.findUnique({
      where: { id },
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
  } catch (error) {
    console.error('Failed to fetch template:', error)
    return null
  }
}

export async function createTemplate(data: {
  name: string
  description?: string
  equipmentType: string
  parentTemplateId?: string
  sections: Array<{
    name: string
    code: string
    order: number
    checkpoints: Array<{
      code: string
      name: string
      critical: boolean
      order: number
    }>
  }>
}) {
  try {
    // Validate equipment type
    const equipmentType = data.equipmentType.toUpperCase().replace(' ', '_') as EquipmentType
    if (!Object.values(EquipmentType).includes(equipmentType)) {
      throw new Error(`Invalid equipment type: ${data.equipmentType}`)
    }

    const template = await prisma.inspectionTemplate.create({
      data: {
        name: data.name,
        description: data.description,
        equipmentType,
        parentTemplateId: data.parentTemplateId || null,
        sections: {
          create: data.sections.map(section => ({
            name: section.name,
            code: section.code,
            order: section.order,
            checkpoints: {
              create: section.checkpoints
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
    
    revalidatePath('/templates')
    return { success: true, data: template }
  } catch (error) {
    console.error('Failed to create template:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to create template' 
    }
  }
}

export async function updateTemplate(
  id: string,
  data: {
    name?: string
    description?: string
    equipmentType?: string
  }
) {
  try {
    const updateData: any = {}
    
    if (data.name !== undefined) updateData.name = data.name
    if (data.description !== undefined) updateData.description = data.description
    
    if (data.equipmentType !== undefined) {
      const equipmentType = data.equipmentType.toUpperCase().replace(' ', '_') as EquipmentType
      if (!Object.values(EquipmentType).includes(equipmentType)) {
        throw new Error(`Invalid equipment type: ${data.equipmentType}`)
      }
      updateData.equipmentType = equipmentType
    }

    const template = await prisma.inspectionTemplate.update({
      where: { id },
      data: updateData
    })
    
    revalidatePath('/templates')
    revalidatePath(`/templates/${id}`)
    return { success: true, data: template }
  } catch (error) {
    console.error('Failed to update template:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to update template' 
    }
  }
}

export async function deleteTemplate(id: string) {
  try {
    await prisma.inspectionTemplate.delete({
      where: { id }
    })
    
    revalidatePath('/templates')
    return { success: true }
  } catch (error) {
    console.error('Failed to delete template:', error)
    return { 
      success: false, 
      error: 'Failed to delete template. It may be in use.' 
    }
  }
}

// Section management
export async function addSection(
  templateId: string,
  data: {
    name: string
    code: string
    order: number
  }
) {
  try {
    const section = await prisma.templateSection.create({
      data: {
        templateId,
        name: data.name,
        code: data.code,
        order: data.order
      }
    })
    
    revalidatePath(`/templates/${templateId}`)
    return { success: true, data: section }
  } catch (error) {
    console.error('Failed to add section:', error)
    return { 
      success: false, 
      error: 'Failed to add section' 
    }
  }
}

export async function updateSection(
  sectionId: string,
  data: {
    name?: string
    code?: string
    order?: number
  }
) {
  try {
    const section = await prisma.templateSection.update({
      where: { id: sectionId },
      data
    })
    
    revalidatePath('/templates')
    return { success: true, data: section }
  } catch (error) {
    console.error('Failed to update section:', error)
    return { 
      success: false, 
      error: 'Failed to update section' 
    }
  }
}

export async function deleteSection(sectionId: string) {
  try {
    // Get the template ID before deleting
    const section = await prisma.templateSection.findUnique({
      where: { id: sectionId }
    })
    
    if (!section) {
      return { success: false, error: 'Section not found' }
    }
    
    await prisma.templateSection.delete({
      where: { id: sectionId }
    })
    
    revalidatePath(`/templates/${section.templateId}`)
    return { success: true }
  } catch (error) {
    console.error('Failed to delete section:', error)
    return { 
      success: false, 
      error: 'Failed to delete section' 
    }
  }
}

// Checkpoint management
export async function addCheckpoint(
  sectionId: string,
  data: {
    code: string
    name: string
    critical: boolean
    order: number
  }
) {
  try {
    const checkpoint = await prisma.templateCheckpoint.create({
      data: {
        sectionId,
        code: data.code,
        name: data.name,
        critical: data.critical,
        order: data.order
      }
    })
    
    revalidatePath('/templates')
    return { success: true, data: checkpoint }
  } catch (error) {
    console.error('Failed to add checkpoint:', error)
    return { 
      success: false, 
      error: 'Failed to add checkpoint' 
    }
  }
}

export async function updateCheckpoint(
  checkpointId: string,
  data: {
    code?: string
    name?: string
    critical?: boolean
    order?: number
  }
) {
  try {
    const checkpoint = await prisma.templateCheckpoint.update({
      where: { id: checkpointId },
      data
    })
    
    revalidatePath('/templates')
    return { success: true, data: checkpoint }
  } catch (error) {
    console.error('Failed to update checkpoint:', error)
    return { 
      success: false, 
      error: 'Failed to update checkpoint' 
    }
  }
}

export async function deleteCheckpoint(checkpointId: string) {
  try {
    await prisma.templateCheckpoint.delete({
      where: { id: checkpointId }
    })
    
    revalidatePath('/templates')
    return { success: true }
  } catch (error) {
    console.error('Failed to delete checkpoint:', error)
    return { 
      success: false, 
      error: 'Failed to delete checkpoint' 
    }
  }
}