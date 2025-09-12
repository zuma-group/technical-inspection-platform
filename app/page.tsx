import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { InspectionStatus } from '@prisma/client'
import { Icons, iconSizes } from '@/lib/icons'
import EquipmentList from './equipment-list'

export const dynamic = 'force-dynamic'
export const revalidate = 0

async function getEquipment() {
  try {
    const equipment = await prisma.equipment.findMany({
      orderBy: { createdAt: 'desc' },
    })
    
    // For each equipment, get both in-progress and last completed inspection
    const equipmentWithInspections = await Promise.all(
      equipment.map(async (eq) => {
        const inProgressInspection = await prisma.inspection.findFirst({
          where: {
            equipmentId: eq.id,
            status: InspectionStatus.IN_PROGRESS
          },
          select: {
            id: true,
            status: true,
            startedAt: true,
            taskId: true,
            serialNumber: true
          }
        })
        
        console.log(`Equipment ${eq.model} (${eq.id}):`, {
          hasInProgress: !!inProgressInspection,
          inProgressId: inProgressInspection?.id
        })
        
        const lastInspection = await prisma.inspection.findFirst({
          where: {
            equipmentId: eq.id,
            status: InspectionStatus.COMPLETED
          },
          orderBy: { completedAt: 'desc' },
          select: {
            id: true,
            status: true,
            startedAt: true,
            completedAt: true
          }
        })
        
        return {
          ...eq,
          hasInProgressInspection: !!inProgressInspection,
          inProgressInspection,
          lastCompletedInspection: lastInspection
        }
      })
    )
    
    return equipmentWithInspections
  } catch (error) {
    console.error('Failed to fetch equipment:', error)
    return []
  }
}

export default async function HomePage() {
  const equipment = await getEquipment()

  if (!equipment || equipment.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Equipment Inspection Platform
              </h1>
              <p className="text-gray-600">
                Track and inspect your construction equipment
              </p>
            </div>
            <div className="flex gap-3">
              <Link href="/dashboard">
                <button className="btn btn-primary inline-flex items-center gap-2">
                  <Icons.dashboard className={iconSizes.sm} />
                  <span>Dashboard</span>
                </button>
              </Link>
              <Link href="/equipment/new">
                <button className="btn btn-secondary inline-flex items-center gap-2">
                  <Icons.add className={iconSizes.sm} />
                  <span>Add Equipment</span>
                </button>
              </Link>
            </div>
          </div>
        </div>
        
        <div className="card text-center py-10">
          <Icons.settings className="w-20 h-20 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">No Equipment Found</h2>
          <p className="text-gray-500 mb-5">Get started by adding your first equipment</p>
          <Link href="/equipment/new">
            <button className="btn btn-primary inline-flex items-center gap-2">
              <Icons.add className={iconSizes.sm} />
              <span>Add Equipment</span>
            </button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Equipment Inspection Platform
            </h1>
            <p className="text-gray-600">
              Select equipment to begin inspection
            </p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <Link href="/dashboard">
              <button className="btn btn-primary inline-flex items-center gap-2">
                <Icons.dashboard className={iconSizes.sm} />
                <span>Dashboard</span>
              </button>
            </Link>
            <Link href="/templates">
              <button className="btn btn-secondary inline-flex items-center gap-2">
                <Icons.settings className={iconSizes.sm} />
                <span>Templates</span>
              </button>
            </Link>
          </div>
        </div>
      </div>
      
      <EquipmentList equipment={equipment} />
    </div>
  )
}