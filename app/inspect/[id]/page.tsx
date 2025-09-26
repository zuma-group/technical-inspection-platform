import { notFound } from 'next/navigation'
import InspectionClient from './client'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
// Avoid enum import to prevent type issues in CI; use string literals for status

export const dynamic = 'force-dynamic'

async function getOrCreateInspection(
  equipmentId: string, 
  templateId?: string,
  taskId?: string,
  serialNumber?: string,
  freightId?: string
) {
  try {
    // Use a SERIALIZABLE transaction to prevent duplicate creation under concurrent requests
    const inspection = await prisma.$transaction(async (tx) => {
      // Ensure equipment exists
      const equipment = await tx.equipment.findUnique({ where: { id: equipmentId } })
      if (!equipment) return null

      // Return existing in-progress if present
      const existing = await tx.inspection.findFirst({
        where: { equipmentId, status: 'IN_PROGRESS' },
        include: {
          equipment: true,
          sections: {
            orderBy: { order: 'asc' },
            include: { checkpoints: { orderBy: { order: 'asc' }, include: { media: true } } }
          }
        }
      })
      if (existing) return existing as any

      // Get or create default user
      let user = await tx.user.findFirst()
      if (!user) {
        user = await tx.user.create({ data: { email: 'tech@system.local', name: 'Field Technician' } })
      }

      // Build sections from chosen or default template
      let sections: Array<{ name: string; order: number; checkpoints: any[] }> = []
      let selectedTemplateId: string | null = null

      if (templateId) {
        const template = await (tx as any).inspectionTemplate.findUnique({
          where: { id: templateId },
          include: { sections: { orderBy: { order: 'asc' }, include: { checkpoints: { orderBy: { order: 'asc' } } } } }
        })
        if (template) {
          selectedTemplateId = template.id
          sections = template.sections.map((section: any) => ({
            name: section.name,
            order: section.order,
            checkpoints: section.checkpoints.map((cp: any) => ({ name: cp.name, critical: cp.critical, order: cp.order }))
          }))
        }
      }

      if (sections.length === 0) {
        const defaultTemplate = await (tx as any).inspectionTemplate.findFirst({
          where: { equipmentType: (equipment as any).type, isDefault: true },
          include: { sections: { orderBy: { order: 'asc' }, include: { checkpoints: { orderBy: { order: 'asc' } } } } }
        })
        if (defaultTemplate) {
          selectedTemplateId = defaultTemplate.id
          sections = defaultTemplate.sections.map((section: any) => ({
            name: section.name,
            order: section.order,
            checkpoints: section.checkpoints.map((cp: any) => ({ name: cp.name, critical: cp.critical, order: cp.order }))
          }))
        }
      }

      if (sections.length === 0) {
        sections = [
          { name: 'General Inspection', order: 1, checkpoints: [
            { name: 'Visual Inspection', critical: false, order: 1 },
            { name: 'Safety Features', critical: true, order: 2 },
            { name: 'Operating Controls', critical: true, order: 3 },
            { name: 'Documentation', critical: false, order: 4 },
          ]}
        ]
      }

      // Create new inspection
      const created = await tx.inspection.create({
        data: {
          equipmentId,
          technicianId: user.id,
          status: 'IN_PROGRESS' as any,
          templateId: selectedTemplateId,
          taskId: taskId || (equipment as any).taskId || null,
          serialNumber: serialNumber || null,
          freightId: freightId || null,
          sections: {
            create: sections.map((section, idx) => ({
              name: section.name,
              code: (section.name || `Section ${idx + 1}`)
                .toUpperCase()
                .replace(/[^A-Z0-9]/g, '')
                .slice(0, 6) || `SEC${idx + 1}`,
              order: section.order,
              checkpoints: { create: section.checkpoints },
            })),
          },
        } as any,
        include: {
          equipment: true,
          sections: { orderBy: { order: 'asc' }, include: { checkpoints: { orderBy: { order: 'asc' }, include: { media: true } } } },
        },
      })

      return created as any
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })

    return inspection
  } catch (error) {
    console.error('Failed to get or create inspection:', error instanceof Error ? error.message : String(error))
    return null
  }
}

export default async function InspectPage({ 
  params,
  searchParams
}: { 
  params: Promise<{ id: string }>
  searchParams: Promise<{ template?: string; taskId?: string; serialNumber?: string; freightId?: string; create?: string }>
}) {
  const { id } = await params
  const { template, taskId, serialNumber, freightId, create } = await searchParams
  
  // Only create inspection if explicitly requested or if template is provided
  const shouldCreate = create === 'true' || !!template
  
  let inspection
  if (shouldCreate) {
    inspection = await getOrCreateInspection(id, template, taskId, serialNumber, freightId)
  } else {
    // Just get existing inspection, don't create
    inspection = await prisma.inspection.findFirst({
      where: {
        equipmentId: id,
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
  }

  if (!inspection) {
    notFound()
  }

  return <InspectionClient inspection={inspection} />
}