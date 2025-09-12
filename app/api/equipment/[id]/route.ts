import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET - Fetch single equipment by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const equipment = await prisma.equipment.findUnique({
      where: { id },
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
                  include: {
                    media: true
                  }
                }
              }
            }
          },
          orderBy: {
            startedAt: 'desc'
          }
        }
      }
    })

    if (!equipment) {
      return NextResponse.json(
        { error: 'Equipment not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ equipment })
  } catch (error) {
    console.error('Error fetching equipment:', error)
    return NextResponse.json(
      { error: 'Failed to fetch equipment' },
      { status: 500 }
    )
  }
}

// PUT - Update equipment
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { type, model, serial, location, hoursUsed, taskId } = body

    // Check if equipment exists
    const existingEquipment = await prisma.equipment.findUnique({
      where: { id }
    })

    if (!existingEquipment) {
      return NextResponse.json(
        { error: 'Equipment not found' },
        { status: 404 }
      )
    }

    // If serial is being updated, check for duplicates
    if (serial && serial !== existingEquipment.serial) {
      const duplicateEquipment = await prisma.equipment.findUnique({
        where: { serial }
      })

      if (duplicateEquipment) {
        return NextResponse.json(
          { error: 'Equipment with this serial number already exists' },
          { status: 409 }
        )
      }
    }

    // Update equipment
    const updatedEquipment = await prisma.equipment.update({
      where: { id },
      data: {
        ...(type && { type }),
        ...(model && { model }),
        ...(serial && { serial }),
        ...(location && { location }),
        ...(hoursUsed !== undefined && { hoursUsed }),
        ...(taskId !== undefined && { taskId })
      },
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
      equipment: updatedEquipment,
      message: 'Equipment updated successfully' 
    })

  } catch (error) {
    console.error('Error updating equipment:', error)
    return NextResponse.json(
      { error: 'Failed to update equipment' },
      { status: 500 }
    )
  }
}

// DELETE - Delete equipment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    // Check if equipment exists
    const existingEquipment = await prisma.equipment.findUnique({
      where: { id },
      include: {
        inspections: true
      }
    })

    if (!existingEquipment) {
      return NextResponse.json(
        { error: 'Equipment not found' },
        { status: 404 }
      )
    }

    // Check if equipment has inspections
    if (existingEquipment.inspections.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete equipment with existing inspections. Please delete inspections first.' },
        { status: 409 }
      )
    }

    // Delete equipment
    await prisma.equipment.delete({
      where: { id }
    })

    return NextResponse.json({ 
      message: 'Equipment deleted successfully' 
    })

  } catch (error) {
    console.error('Error deleting equipment:', error)
    return NextResponse.json(
      { error: 'Failed to delete equipment' },
      { status: 500 }
    )
  }
}
