import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// POST - Import equipment from external sources (unified listing platform)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      source, // 'unified_listing', 'manual', etc.
      sourceId, // ID from the external system
      type, 
      model, 
      serial, 
      location, 
      hoursUsed, 
      taskId,
      additionalData // Any extra fields from the external system
    } = body

    // Validate required fields
    if (!type || !model || !serial || !location) {
      return NextResponse.json(
        { error: 'Missing required fields: type, model, serial, location' },
        { status: 400 }
      )
    }

    // Check if equipment with this serial already exists
    const existingEquipment = await prisma.equipment.findUnique({
      where: { serial }
    })

    if (existingEquipment) {
      return NextResponse.json(
        { 
          error: 'Equipment with this serial number already exists',
          existingEquipment: {
            id: existingEquipment.id,
            type: existingEquipment.type,
            model: existingEquipment.model,
            serial: existingEquipment.serial,
            location: existingEquipment.location,
            status: existingEquipment.status
          }
        },
        { status: 409 }
      )
    }

    // Check if equipment from this source already exists
    if (source && sourceId) {
      // Note: You might want to add a sourceId field to the Equipment model
      // For now, we'll use a combination of source and additionalData
      const existingBySource = await prisma.equipment.findFirst({
        where: {
          AND: [
            { type },
            { model },
            { location }
          ]
        }
      })

      if (existingBySource) {
        return NextResponse.json(
          { 
            error: 'Similar equipment already exists',
            existingEquipment: {
              id: existingBySource.id,
              type: existingBySource.type,
              model: existingBySource.model,
              serial: existingBySource.serial,
              location: existingBySource.location,
              status: existingBySource.status
            }
          },
          { status: 409 }
        )
      }
    }

    // Create new equipment
    const createData: any = {
      type,
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

    // Log the import for tracking
    console.log(`Equipment imported from ${source || 'unknown'}:`, {
      equipmentId: equipment.id,
      source,
      sourceId,
      serial: equipment.serial,
      type: equipment.type,
      model: equipment.model,
      location: equipment.location,
      additionalData
    })

    return NextResponse.json({ 
      equipment,
      importInfo: {
        source,
        sourceId,
        importedAt: new Date().toISOString(),
        additionalData
      },
      message: 'Equipment imported successfully' 
    }, { status: 201 })

  } catch (error) {
    console.error('Error importing equipment:', error)
    return NextResponse.json(
      { error: 'Failed to import equipment' },
      { status: 500 }
    )
  }
}

// GET - Get import statistics
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const _source = searchParams.get('source')

    // Get total equipment count
    const totalEquipment = await prisma.equipment.count()

    // Get equipment by status
    const equipmentByStatus = await prisma.equipment.groupBy({
      by: ['status'],
      _count: {
        status: true
      }
    })

    // Get equipment by type
    const equipmentByType = await prisma.equipment.groupBy({
      by: ['type'],
      _count: {
        type: true
      }
    })

    // Get recent equipment (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const recentEquipment = await prisma.equipment.count({
      where: {
        createdAt: {
          gte: thirtyDaysAgo
        }
      }
    })

    return NextResponse.json({
      statistics: {
        totalEquipment,
        recentEquipment,
        equipmentByStatus: equipmentByStatus.map(item => ({
          status: item.status,
          count: item._count.status
        })),
        equipmentByType: equipmentByType.map(item => ({
          type: item.type,
          count: item._count.type
        }))
      }
    })

  } catch (error) {
    console.error('Error fetching import statistics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch import statistics' },
      { status: 500 }
    )
  }
}
