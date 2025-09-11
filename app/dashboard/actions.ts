'use server'

import { prisma } from '@/lib/prisma'
import { CheckpointStatus } from '@prisma/client'

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