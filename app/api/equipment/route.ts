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

    const where: Record<string, any> = {}
    
    if (status) where.status = status
    if (type) where.type = type
    if (location) where.location = { contains: location, mode: 'insensitive' }

    const equipment = await prisma.equipment.findMany({
      where,
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
          },
          take: 5 // Latest 5 inspections
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

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
