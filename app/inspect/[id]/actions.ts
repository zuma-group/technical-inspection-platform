'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { sendEmailWithPdf, generateEmailContent } from '@/lib/email'
import { getInspectionForPDF, generateInspectionPDF } from '@/lib/pdf-generator'

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
	
	// Notify external system after completion (best-effort; non-blocking failure)
	try {
		// Prefer freightId when present; fallback to inspection.taskId, then equipment.taskId
		const externalTaskId = (inspection as any).freightId 
			|| (inspection as any).taskId 
			|| (inspection as any).equipment?.taskId
		if (externalTaskId) {
			const response = await fetch('https://staging.zuma.odolution.com/api/get_task_files', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ task_id: String(externalTaskId) }),
				cache: 'no-store'
			})
			if (!response.ok) {
				console.error('Failed to call get_task_files endpoint', { status: response.status, statusText: response.statusText })
			} else {
				console.log('Called get_task_files endpoint successfully for taskId:', String(externalTaskId))
			}
		} else {
			console.warn('Inspection has no task or freight id; skipping get_task_files call')
		}
	} catch (externalErr) {
		console.error('Error calling external get_task_files endpoint:', externalErr)
	}
    
    // Generate PDF report and send email (best-effort; non-blocking failure)
    try {
      const finalInspection = await getInspectionForPDF(inspectionId)

      if (finalInspection) {
        const pdfBytes = await generateInspectionPDF(finalInspection)
        const emailContent = generateEmailContent(finalInspection)

        const toEmail = process.env.REPORT_FALLBACK_EMAIL
        if (toEmail) {
          const info = await sendEmailWithPdf({
            to: toEmail,
            subject: emailContent.subject,
            html: emailContent.html,
            text: emailContent.text,
            pdf: { filename: emailContent.filename, content: Buffer.from(pdfBytes) }
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

export async function markAllCheckpointsAsPass(inspectionId: string) {
  try {
    console.log('Marking all checkpoints as PASS for inspection:', inspectionId)
    
    // Get the inspection with all checkpoints
    const inspection = await prisma.inspection.findUnique({
      where: { id: inspectionId },
      include: {
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

    // Get all checkpoint IDs that don't already have a status
    const checkpointIds = inspection.sections
      .flatMap(section => section.checkpoints)
      .filter(checkpoint => !checkpoint.status) // Only update checkpoints without a status
      .map(checkpoint => checkpoint.id)

    if (checkpointIds.length === 0) {
      return { success: true, message: 'All checkpoints already have a status' }
    }

    // Update all checkpoints to PASS status
    await prisma.checkpoint.updateMany({
      where: {
        id: { in: checkpointIds }
      },
      data: {
        status: 'PASS' as any,
        notes: null,
        estimatedHours: null
      }
    })

    console.log(`Updated ${checkpointIds.length} checkpoints to PASS`)
    
    revalidatePath('/inspect/[id]', 'page')
    return { success: true, updatedCount: checkpointIds.length }
  } catch (error) {
    console.error('Failed to mark all checkpoints as pass:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to mark all checkpoints as pass' 
    }
  }
}

export async function updateTechnicianRemarks(inspectionId: string, remarks: string) {
  try {
    await prisma.inspection.update({
      where: { id: inspectionId },
      data: { technicianRemarks: remarks || null } as any
    })
    revalidatePath('/inspect/[id]', 'page')
    return { success: true }
  } catch (error) {
    console.error('Failed to update technician remarks:', error)
    return { success: false, error: 'Failed to save remarks' }
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