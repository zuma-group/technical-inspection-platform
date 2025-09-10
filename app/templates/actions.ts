'use server'

import { revalidatePath } from 'next/cache'
import { mockStorage } from '@/lib/mock-storage'

export async function getTemplates() {
  if (!process.env.DATABASE_URL) {
    return mockStorage.templates.getAll()
  }

  try {
    const { prisma } = await import('@/lib/prisma')
    return await prisma.inspectionTemplate.findMany({
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
  } catch (error) {
    console.error('Failed to fetch templates:', error)
    return mockStorage.templates.getAll()
  }
}

export async function getTemplate(id: string) {
  if (!process.env.DATABASE_URL) {
    return mockStorage.templates.getById(id) || null
  }

  try {
    const { prisma } = await import('@/lib/prisma')
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
    return mockStorage.templates.getById(id) || null
  }
}

export async function createTemplate(data: {
  name: string
  description?: string
  equipmentType: string
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
  if (!process.env.DATABASE_URL) {
    console.log('Mock mode: Creating template', data)
    const newTemplate = mockStorage.templates.create(data)
    revalidatePath('/templates')
    return newTemplate
  }

  try {
    const { prisma } = await import('@/lib/prisma')
    const template = await prisma.inspectionTemplate.create({
      data: {
        name: data.name,
        description: data.description,
        equipmentType: data.equipmentType,
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
      }
    })
    revalidatePath('/templates')
    return template
  } catch (error) {
    console.error('Failed to create template:', error)
    throw error
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
  if (!process.env.DATABASE_URL) {
    console.log('Mock mode: Updating template', { id, data })
    mockStorage.templates.update(id, data)
    revalidatePath('/templates')
    revalidatePath(`/templates/${id}/edit`)
    return
  }

  try {
    const { prisma } = await import('@/lib/prisma')
    await prisma.inspectionTemplate.update({
      where: { id },
      data
    })
    revalidatePath('/templates')
    revalidatePath(`/templates/${id}/edit`)
  } catch (error) {
    console.error('Failed to update template:', error)
    throw error
  }
}

export async function deleteTemplate(id: string) {
  if (!process.env.DATABASE_URL) {
    console.log('Mock mode: Deleting template', { id })
    mockStorage.templates.delete(id)
    revalidatePath('/templates')
    return
  }

  try {
    const { prisma } = await import('@/lib/prisma')
    await prisma.inspectionTemplate.delete({
      where: { id }
    })
    revalidatePath('/templates')
  } catch (error) {
    console.error('Failed to delete template:', error)
    throw error
  }
}

export async function addSection(
  templateId: string,
  section: {
    name: string
    code: string
    order: number
  }
) {
  if (!process.env.DATABASE_URL) {
    console.log('Mock mode: Adding section', { templateId, section })
    const newSection = mockStorage.templates.addSection(templateId, section)
    revalidatePath(`/templates/${templateId}/edit`)
    return newSection || { id: 'mock-section' }
  }

  try {
    const { prisma } = await import('@/lib/prisma')
    const newSection = await prisma.templateSection.create({
      data: {
        templateId,
        ...section
      }
    })
    revalidatePath(`/templates/${templateId}/edit`)
    return newSection
  } catch (error) {
    console.error('Failed to add section:', error)
    throw error
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
  if (!process.env.DATABASE_URL) {
    console.log('Mock mode: Updating section', { sectionId, data })
    mockStorage.templates.updateSection(sectionId, data)
    revalidatePath('/templates')
    return
  }

  try {
    const { prisma } = await import('@/lib/prisma')
    await prisma.templateSection.update({
      where: { id: sectionId },
      data
    })
    revalidatePath('/templates')
  } catch (error) {
    console.error('Failed to update section:', error)
    throw error
  }
}

export async function deleteSection(sectionId: string) {
  if (!process.env.DATABASE_URL) {
    console.log('Mock mode: Deleting section', { sectionId })
    mockStorage.templates.deleteSection(sectionId)
    revalidatePath('/templates')
    return
  }

  try {
    const { prisma } = await import('@/lib/prisma')
    await prisma.templateSection.delete({
      where: { id: sectionId }
    })
    revalidatePath('/templates')
  } catch (error) {
    console.error('Failed to delete section:', error)
    throw error
  }
}

export async function addCheckpoint(
  sectionId: string,
  checkpoint: {
    code: string
    name: string
    critical: boolean
    order: number
  }
) {
  if (!process.env.DATABASE_URL) {
    console.log('Mock mode: Adding checkpoint', { sectionId, checkpoint })
    const newCheckpoint = mockStorage.templates.addCheckpoint(sectionId, checkpoint)
    revalidatePath('/templates')
    return newCheckpoint || { id: 'mock-checkpoint' }
  }

  try {
    const { prisma } = await import('@/lib/prisma')
    const newCheckpoint = await prisma.templateCheckpoint.create({
      data: {
        sectionId,
        ...checkpoint
      }
    })
    revalidatePath('/templates')
    return newCheckpoint
  } catch (error) {
    console.error('Failed to add checkpoint:', error)
    throw error
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
  if (!process.env.DATABASE_URL) {
    console.log('Mock mode: Updating checkpoint', { checkpointId, data })
    mockStorage.templates.updateCheckpoint(checkpointId, data)
    revalidatePath('/templates')
    return
  }

  try {
    const { prisma } = await import('@/lib/prisma')
    await prisma.templateCheckpoint.update({
      where: { id: checkpointId },
      data
    })
    revalidatePath('/templates')
  } catch (error) {
    console.error('Failed to update checkpoint:', error)
    throw error
  }
}

export async function deleteCheckpoint(checkpointId: string) {
  if (!process.env.DATABASE_URL) {
    console.log('Mock mode: Deleting checkpoint', { checkpointId })
    mockStorage.templates.deleteCheckpoint(checkpointId)
    revalidatePath('/templates')
    return
  }

  try {
    const { prisma } = await import('@/lib/prisma')
    await prisma.templateCheckpoint.delete({
      where: { id: checkpointId }
    })
    revalidatePath('/templates')
  } catch (error) {
    console.error('Failed to delete checkpoint:', error)
    throw error
  }
}