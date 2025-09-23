'use server'

import { prisma } from '@/lib/prisma'
import { CheckpointStatus } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { getSession, hashPassword } from '@/lib/auth'

export async function getDashboardData() {
  try {
    // Get all equipment with their latest inspection - optimized query
    const equipment = await prisma.equipment.findMany({
      include: {
        inspections: {
          orderBy: { startedAt: 'desc' },
          take: 1,
          select: {
            id: true,
            startedAt: true,
            status: true
          }
        }
      }
    })

    // Get recent inspections with minimal data needed for dashboard
    const inspections = await prisma.inspection.findMany({
      include: {
        technician: {
          select: {
            name: true
          }
        },
        sections: {
          include: {
            checkpoints: {
              where: {
                // Only fetch checkpoints with issues for dashboard metrics
                status: CheckpointStatus.ACTION_REQUIRED
              },
              select: {
                critical: true
              }
            }
          }
        }
      },
      orderBy: { startedAt: 'desc' },
      take: 50 // Last 50 inspections
    })

    // Process inspections to add issue counts
    const processedInspections = inspections.map(inspection => {
      let criticalIssues = 0
      let nonCriticalIssues = 0
      
      inspection.sections.forEach(section => {
        section.checkpoints.forEach(checkpoint => {
          if (checkpoint.critical) {
            criticalIssues++
          } else {
            nonCriticalIssues++
          }
        })
      })

      return {
        id: inspection.id,
        equipmentId: inspection.equipmentId,
        startedAt: inspection.startedAt,
        completedAt: inspection.completedAt,
        status: inspection.status,
        technicianName: inspection.technician.name,
        criticalIssues,
        nonCriticalIssues
      }
    })

    return {
      success: true,
      equipment,
      inspections: processedInspections
    }
  } catch (error) {
    console.error('Failed to fetch dashboard data:', error)
    return {
      success: false,
      error: 'Failed to fetch dashboard data',
      equipment: [],
      inspections: []
    }
  }
}

export async function getRecentInspections(days: number = 30) {
  try {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - days)
    
    const inspections = await prisma.inspection.findMany({
      where: {
        startedAt: {
          gte: cutoffDate
        }
      },
      include: {
        equipment: {
          select: {
            model: true,
            serial: true
          }
        },
        technician: {
          select: {
            name: true
          }
        },
        sections: {
          include: {
            checkpoints: {
              where: {
                status: CheckpointStatus.ACTION_REQUIRED
              },
              select: {
                critical: true
              }
            }
          }
        }
      },
      orderBy: { startedAt: 'desc' }
    })

    return {
      success: true,
      data: inspections.map(inspection => ({
        id: inspection.id,
        equipment: inspection.equipment,
        startedAt: inspection.startedAt,
        completedAt: inspection.completedAt,
        status: inspection.status,
        technicianName: inspection.technician.name,
        criticalIssues: inspection.sections.flatMap(s => s.checkpoints).filter(c => c.critical).length,
        nonCriticalIssues: inspection.sections.flatMap(s => s.checkpoints).filter(c => !c.critical).length
      }))
    }
  } catch (error) {
    console.error('Failed to fetch recent inspections:', error)
    return {
      success: false,
      error: 'Failed to fetch recent inspections',
      data: []
    }
  }
}

export async function getEquipmentByStatus() {
  try {
    // Use aggregation for better performance
    const equipmentByStatus = await prisma.equipment.groupBy({
      by: ['status'],
      _count: {
        id: true
      }
    })

    // Get detailed equipment for each status
    const statusDetails = await Promise.all(
      equipmentByStatus.map(async (group) => ({
        status: group.status,
        count: group._count.id,
        equipment: await prisma.equipment.findMany({
          where: { status: group.status },
          include: {
            inspections: {
              orderBy: { startedAt: 'desc' },
              take: 1,
              select: {
                startedAt: true,
                status: true
              }
            }
          }
        })
      }))
    )

    return {
      success: true,
      data: statusDetails
    }
  } catch (error) {
    console.error('Failed to fetch equipment by status:', error)
    return {
      success: false,
      error: 'Failed to fetch equipment by status',
      data: []
    }
  }
}

export async function getOverdueInspections(daysSinceLastInspection: number = 30) {
  try {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysSinceLastInspection)
    
    // Get equipment that either:
    // 1. Has never been inspected
    // 2. Last inspection was before cutoff date
    const overdueEquipment = await prisma.equipment.findMany({
      where: {
        OR: [
          {
            inspections: {
              none: {}
            }
          },
          {
            inspections: {
              every: {
                startedAt: {
                  lt: cutoffDate
                }
              }
            }
          }
        ]
      },
      include: {
        inspections: {
          orderBy: { startedAt: 'desc' },
          take: 1,
          select: {
            startedAt: true,
            status: true
          }
        }
      }
    })

    return {
      success: true,
      data: overdueEquipment.map(equipment => ({
        ...equipment,
        daysSinceLastInspection: equipment.inspections[0] 
          ? Math.floor((Date.now() - new Date(equipment.inspections[0].startedAt).getTime()) / (1000 * 60 * 60 * 24))
          : null
      }))
    }
  } catch (error) {
    console.error('Failed to fetch overdue inspections:', error)
    return {
      success: false,
      error: 'Failed to fetch overdue inspections',
      data: []
    }
  }
}

export async function getDashboardMetrics() {
  try {
    const [
      totalEquipment,
      operationalCount,
      maintenanceCount,
      outOfServiceCount,
      activeInspections,
      completedToday,
      overdueCount
    ] = await Promise.all([
      prisma.equipment.count(),
      prisma.equipment.count({ where: { status: 'OPERATIONAL' } }),
      prisma.equipment.count({ where: { status: 'MAINTENANCE' } }),
      prisma.equipment.count({ where: { status: 'OUT_OF_SERVICE' } }),
      prisma.inspection.count({ where: { status: 'IN_PROGRESS' } }),
      prisma.inspection.count({
        where: {
          completedAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0))
          }
        }
      }),
      // Count equipment not inspected in last 30 days
      prisma.equipment.count({
        where: {
          OR: [
            { inspections: { none: {} } },
            {
              inspections: {
                every: {
                  startedAt: {
                    lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
                  }
                }
              }
            }
          ]
        }
      })
    ])

    return {
      success: true,
      metrics: {
        totalEquipment,
        operationalCount,
        maintenanceCount,
        outOfServiceCount,
        activeInspections,
        completedToday,
        overdueCount
      }
    }
  } catch (error) {
    console.error('Failed to fetch dashboard metrics:', error)
    return {
      success: false,
      error: 'Failed to fetch dashboard metrics',
      metrics: null
    }
  }
}

// Admin-only: User management actions

async function requireAdmin() {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    throw new Error('Unauthorized')
  }
  return session
}

export async function getUsers() {
  await requireAdmin()
  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, createdAt: true },
      orderBy: { createdAt: 'desc' }
    })
    return { success: true, data: users }
  } catch (error) {
    console.error('Failed to fetch users:', error)
    return { success: false, error: 'Failed to fetch users', data: [] }
  }
}

export async function createUserAction(data: { name: string; email: string; role: string; password: string }) {
  await requireAdmin()
  try {
    if (!data.name || !data.email || !data.role || !data.password) {
      return { success: false, error: 'All fields are required' }
    }
    const normalizedRole = data.role.toUpperCase().replace(/\s+/g, '_')
    const passwordHash = await hashPassword(data.password)
    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email.trim().toLowerCase(),
        role: normalizedRole as any,
        password: passwordHash
      } as any,
      select: { id: true, name: true, email: true, role: true, createdAt: true }
    })
    revalidatePath('/dashboard')
    return { success: true, data: user }
  } catch (error) {
    console.error('Failed to create user:', error)
    const message = error instanceof Error && /Unique constraint/i.test(error.message)
      ? 'A user with this email already exists'
      : 'Failed to create user'
    return { success: false, error: message }
  }
}

export async function updateUserAction(
  id: string,
  updates: { name?: string; email?: string; role?: string; newPassword?: string }
) {
  await requireAdmin()
  try {
    const data: Record<string, any> = {}
    if (updates.name !== undefined) data.name = updates.name
    if (updates.email !== undefined) data.email = updates.email.trim().toLowerCase()
    if (updates.role !== undefined) data.role = updates.role.toUpperCase().replace(/\s+/g, '_') as any
    if (updates.newPassword) data.password = await hashPassword(updates.newPassword)

    const user = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, name: true, email: true, role: true, createdAt: true }
    })
    revalidatePath('/dashboard')
    return { success: true, data: user }
  } catch (error) {
    console.error('Failed to update user:', error)
    const message = error instanceof Error && /Record to update not found/i.test(error.message)
      ? 'User not found'
      : 'Failed to update user'
    return { success: false, error: message }
  }
}

export async function deleteUserAction(id: string) {
  const session = await requireAdmin()
  try {
    // Prevent deleting self
    if (id === session.userId) {
      return { success: false, error: 'You cannot delete your own account' }
    }

    // Prevent removing the last admin
    const adminCount = await prisma.user.count({ where: { role: 'ADMIN' as any } })
    const user = await prisma.user.findUnique({ where: { id }, select: { role: true } })
    if (user?.role === ('ADMIN' as any) && adminCount <= 1) {
      return { success: false, error: 'Cannot delete the last admin' }
    }

    await prisma.user.delete({ where: { id } })
    revalidatePath('/dashboard')
    return { success: true }
  } catch (error) {
    console.error('Failed to delete user:', error)
    return { success: false, error: 'Failed to delete user' }
  }
}