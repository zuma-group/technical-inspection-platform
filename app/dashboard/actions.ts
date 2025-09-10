'use server'

import { mockStorage } from '@/lib/mock-storage'

export async function getDashboardData() {
  // Check if DATABASE_URL exists
  if (!process.env.DATABASE_URL) {
    console.log('Using mock data for dashboard')
    
    // Get equipment with inspection history
    const equipment = mockStorage.equipment.getAll()
    const inspections = mockStorage.inspections.getAll()
    
    return {
      equipment,
      inspections
    }
  }

  try {
    const { prisma } = await import('@/lib/prisma')
    
    // Get all equipment with their latest inspection
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

    // Get all inspections with details
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
              select: {
                status: true,
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
          if (checkpoint.status === 'ACTION_REQUIRED') {
            if (checkpoint.critical) {
              criticalIssues++
            } else {
              nonCriticalIssues++
            }
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
      equipment,
      inspections: processedInspections
    }
  } catch (error) {
    console.error('Database connection failed, using mock data:', error)
    
    const equipment = mockStorage.equipment.getAll()
    const inspections = mockStorage.inspections.getAll()
    
    return {
      equipment,
      inspections
    }
  }
}

export async function getRecentInspections(days: number = 30) {
  const data = await getDashboardData()
  
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - days)
  
  return data.inspections.filter(i => 
    new Date(i.startedAt) > cutoffDate
  ).sort((a, b) => 
    new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
  )
}

export async function getEquipmentByStatus() {
  const data = await getDashboardData()
  
  const statusGroups = {
    OPERATIONAL: [] as typeof data.equipment,
    MAINTENANCE: [] as typeof data.equipment,
    OUT_OF_SERVICE: [] as typeof data.equipment,
    IN_INSPECTION: [] as typeof data.equipment
  }
  
  data.equipment.forEach(eq => {
    const status = eq.status as keyof typeof statusGroups
    if (statusGroups[status]) {
      statusGroups[status].push(eq)
    }
  })
  
  return statusGroups
}

export async function getOverdueInspections(daysSinceLastInspection: number = 30) {
  const data = await getDashboardData()
  
  const overdue = data.equipment.filter(eq => {
    const lastInspection = eq.inspections?.[0]
    if (!lastInspection) return true // Never inspected
    
    const daysSince = Math.floor(
      (Date.now() - new Date(lastInspection.startedAt).getTime()) / (1000 * 60 * 60 * 24)
    )
    
    return daysSince > daysSinceLastInspection
  })
  
  return overdue
}