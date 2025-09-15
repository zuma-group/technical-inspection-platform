import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET - Fetch all equipment
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const type = searchParams.get('type')
    const location = searchParams.get('location')
    const taskId = searchParams.get('taskId')

    const where: Record<string, any> = {}
    
    if (status) where.status = status
    if (type) where.type = type
    if (location) where.location = { contains: location, mode: 'insensitive' }
    if (taskId) where.taskId = taskId

    const equipmentRaw = await prisma.equipment.findMany({
      where,
      include: {
        inspections: {
          include: {
            technician: {
              select: {
                name: true,
                email: true
              }
            },
            sections: {
              include: {
                checkpoints: {
                  select: {
                    id: true,
                    media: {
                      select: { id: true, type: true }
                    }
                  }
                }
              }
            }
          },
          orderBy: { startedAt: 'desc' },
          take: 5
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Map to add media URLs and pdfUrl without returning heavy section data
    const equipment = equipmentRaw.map((eq: any) => ({
      ...eq,
      inspections: eq.inspections.map((insp: any) => {
        const media = (insp.sections || [])
          .flatMap((s: any) => s.checkpoints)
          .flatMap((cp: any) => cp.media || [])
          .map((m: any) => ({ id: m.id, type: m.type, url: `/api/media/${m.id}` }))
        return {
          id: insp.id,
          status: insp.status,
          startedAt: insp.startedAt,
          completedAt: insp.completedAt,
          technician: insp.technician,
          pdfUrl: `/api/inspections/${insp.id}/pdf`,
          media
        }
      })
    }))

    return NextResponse.json({ equipment })
  } catch (error) {
    console.error('Error fetching equipment:', error)
    return NextResponse.json(
      { error: 'Failed to fetch equipment' },
      { status: 500 }
    )
  }
}

// POST - Create new equipment
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type: inputType, model, serial, location, hoursUsed, taskId } = body

    // Validate required fields
    if (!model || !serial || !location) {
      return NextResponse.json(
        { error: 'Missing required fields: model, serial, location' },
        { status: 400 }
      )
    }

    // Normalize and validate enum-like inputs to reduce failures
    const normalizeEnum = (value?: string) =>
      value?.toString().trim().toUpperCase().replace(/[\s-]+/g, '_')

    const EQUIPMENT_TYPES = ['BOOM_LIFT','SCISSOR_LIFT','TELEHANDLER','FORKLIFT','OTHER'] as const

    const normalizedType = normalizeEnum(inputType)
    const validatedType = EQUIPMENT_TYPES.includes((normalizedType as any)) ? normalizedType : 'OTHER'

    

    // Check if equipment with this serial already exists
    const existingEquipment = await prisma.equipment.findUnique({
      where: { serial }
    })

    if (existingEquipment) {
      return NextResponse.json(
        { error: 'Equipment with this serial number already exists' },
        { status: 409 }
      )
    }

    // Create new equipment
    const createData: any = {
      type: validatedType as any,
      model,
      serial,
      location,
      hoursUsed: hoursUsed || 0
    }
    if (taskId) createData.taskId = taskId

    const equipment = await prisma.equipment.create({
      data: createData,
      include: {
        inspections: {
          select: {
            id: true,
            status: true,
            startedAt: true,
            completedAt: true,
            technician: {
              select: {
                name: true,
                email: true
              }
            }
          },
          orderBy: {
            startedAt: 'desc'
          }
        }
      }
    })

    return NextResponse.json({ 
      equipment,
      message: 'Equipment added successfully' 
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating equipment:', error)
    return NextResponse.json(
      { error: 'Failed to create equipment' },
      { status: 500 }
    )
  }
}
