'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { sendEmailWithPdf } from '@/lib/email'

export async function updateCheckpoint(
  checkpointId: string, 
  status: string,
  notes?: string,
  estimatedHours?: number
) {
  try {
    // Validate status
    const CHECKPOINT_STATUSES = ['PASS','CORRECTED','ACTION_REQUIRED','NOT_APPLICABLE'] as const
    if (!CHECKPOINT_STATUSES.includes(status as any)) {
      throw new Error(`Invalid checkpoint status: ${status}`)
    }

    await prisma.checkpoint.update({
      where: { id: checkpointId },
      data: { 
        status: status as any,
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
    console.log('Stopping inspection:', inspectionId)
    
    // First check if inspection exists
    const inspection = await prisma.inspection.findUnique({
      where: { id: inspectionId }
    })
    
    if (!inspection) {
      console.error('Inspection not found:', inspectionId)
      return { success: false, error: 'Inspection not found' }
    }
    
    console.log('Found inspection, deleting...', inspection)
    
    // Delete the inspection and all related data (cascading delete will handle sections, checkpoints, media)
    await prisma.inspection.delete({
      where: { id: inspectionId }
    })
    
    console.log('Inspection deleted successfully')
    
    revalidatePath('/', 'layout')
    revalidatePath('/', 'page')
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
    console.log('Completing inspection:', inspectionId)
    
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
      console.error('Inspection not found:', inspectionId)
      throw new Error('Inspection not found')
    }
    
    console.log('Found inspection, status:', inspection.status)

    // Flatten all checkpoints
    const allCheckpoints = inspection.sections.flatMap(section => section.checkpoints)
    
    // Check for issues
    const hasActionRequired = allCheckpoints.some(cp => cp.status === 'ACTION_REQUIRED')
    const hasCriticalIssues = allCheckpoints.some(cp => cp.critical && cp.status === 'ACTION_REQUIRED')
    
    // Determine equipment status
    let equipmentStatus: any = 'OPERATIONAL'
    if (hasCriticalIssues) {
      equipmentStatus = 'OUT_OF_SERVICE'
    } else if (hasActionRequired) {
      equipmentStatus = 'MAINTENANCE'
    }

    console.log('Updating to equipment status:', equipmentStatus)
    
    // Use a transaction to ensure both updates succeed or fail together
    const [updatedInspection, updatedEquipment] = await prisma.$transaction([
      // Update inspection status
      prisma.inspection.update({
        where: { id: inspectionId },
        data: {
          status: 'COMPLETED' as any,
          completedAt: new Date(),
        }
      }),
      // Update equipment status
      prisma.equipment.update({
        where: { id: inspection.equipmentId },
        data: { status: equipmentStatus }
      })
    ])
    
    console.log('Transaction complete. Inspection status:', updatedInspection.status)
    console.log('Equipment status:', updatedEquipment.status)
    
    // Generate PDF report and send email (best-effort; non-blocking failure)
    try {
      const finalInspection = await prisma.inspection.findUnique({
        where: { id: inspectionId },
        include: {
          equipment: true,
          technician: { select: { name: true, email: true } },
          sections: {
            orderBy: { order: 'asc' },
            include: { checkpoints: { orderBy: { order: 'asc' } } }
          }
        }
      })

      if (finalInspection) {
        const pdfDoc = await PDFDocument.create()
        const pageMargin = 50
        const pageWidth = 612
        const pageHeight = 792
        const titleFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
        const bodyFont = await pdfDoc.embedFont(StandardFonts.Helvetica)

        const addPage = () => pdfDoc.addPage([pageWidth, pageHeight])
        let page = addPage()
        let y = pageHeight - pageMargin

        const drawText = (text: string, options?: { size?: number; font?: any; color?: any }) => {
          const size = options?.size ?? 12
          const font = options?.font ?? bodyFont
          const color = options?.color ?? rgb(0, 0, 0)
          const maxWidth = pageWidth - pageMargin * 2
          const words = text.split(' ')
          let line = ''
          const lines: string[] = []
          for (const w of words) {
            const test = line ? line + ' ' + w : w
            const width = font.widthOfTextAtSize(test, size)
            if (width > maxWidth) {
              if (line) lines.push(line)
              line = w
            } else {
              line = test
            }
          }
          if (line) lines.push(line)
          for (const l of lines) {
            if (y - size < pageMargin) {
              page = addPage()
              y = pageHeight - pageMargin
            }
            page.drawText(l, { x: pageMargin, y, size, font, color })
            y -= size + 4
          }
        }

        drawText('Inspection Report', { size: 20, font: titleFont })
        y -= 6
        drawText(`Equipment: ${finalInspection.equipment.model} (${finalInspection.equipment.serial})`)
        drawText(`Date: ${new Date(finalInspection.startedAt).toLocaleString()}`)
        drawText(`Status: ${finalInspection.status.replace(/_/g, ' ')}`)
        drawText(`Technician: ${finalInspection.technician?.name || 'N/A'}`)
        y -= 8

        for (const section of finalInspection.sections) {
          y -= 6
          drawText(section.name, { size: 14, font: titleFont })
          for (const cp of section.checkpoints) {
            const statusText = cp.status ?? 'N/A'
            const critical = cp.critical ? ' (CRITICAL)' : ''
            drawText(`• [${statusText}] ${cp.name}${critical}`)
            if (cp.notes) drawText(`   Notes: ${cp.notes}`)
          }
        }

        const pdfBytes = await pdfDoc.save()

        const toEmail = process.env.REPORT_FALLBACK_EMAIL
        if (toEmail) {
          const info = await sendEmailWithPdf({
            to: toEmail,
            subject: `Inspection Report - ${finalInspection.equipment.model} (${finalInspection.equipment.serial})`,
            text: 'Please find the attached inspection report PDF.',
            pdf: { filename: `inspection-${finalInspection.id}.pdf`, content: Buffer.from(pdfBytes) }
          })
          console.log('📧 Inspection report email queued', {
            to: toEmail,
            messageId: (info as any)?.messageId || 'n/a'
          })
        } else {
          console.warn('No recipient email found for inspection report')
        }
      }
    } catch (emailErr) {
      console.error('Failed to email inspection report:', emailErr)
    }

    revalidatePath('/', 'layout')
    revalidatePath('/', 'page')
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

export async function createInspection(
  equipmentId: string, 
  technicianId: string, 
  templateId?: string,
  taskId?: string,
  serialNumber?: string
) {
  try {
    // Check if there's already an in-progress inspection
    const existingInspection = await prisma.inspection.findFirst({
      where: {
        equipmentId,
        status: 'IN_PROGRESS' as any
      }
    })

    if (existingInspection) {
      return { success: true, data: existingInspection }
    }

    // Get template if specified, otherwise get default template for equipment type
    let template = null
    if (templateId) {
      template = await (prisma as any).inspectionTemplate.findUnique({
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
        template = await (prisma as any).inspectionTemplate.findFirst({
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
        taskId: taskId || null,
        serialNumber: serialNumber || null,
        status: 'IN_PROGRESS' as any,
        sections: {
          create: template.sections.map((section, idx) => ({
            name: section.name,
            code: (section.name || `Section ${idx + 1}`)
              .toUpperCase()
              .replace(/[^A-Z0-9]/g, '')
              .slice(0, 6) || `SEC${idx + 1}`,
            order: section.order,
            checkpoints: {
              create: section.checkpoints.map(checkpoint => ({
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
      } as any,
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