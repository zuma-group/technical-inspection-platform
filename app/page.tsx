import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { InspectionStatus } from '@prisma/client'
import { Icons, iconSizes } from '@/lib/icons'

export const dynamic = 'force-dynamic'

async function getEquipment() {
  try {
    const equipment = await prisma.equipment.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        inspections: {
          where: {
            status: InspectionStatus.IN_PROGRESS
          },
          take: 1,
          select: {
            id: true,
            status: true,
            startedAt: true
          }
        },
      },
    })
    
    // Add a flag to indicate if there's an in-progress inspection
    return equipment.map(eq => ({
      ...eq,
      hasInProgressInspection: eq.inspections.length > 0
    }))
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
                No equipment found. Add equipment to begin.
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
        
        <div className="flex justify-center mt-12">
          <Link href="/equipment/new" className="no-underline">
            <div className="card flex flex-col items-center justify-center min-h-[240px] cursor-pointer border-3 border-dashed border-blue-400 hover:border-blue-500 transition-all p-8 max-w-md">
              <Icons.addCircle className="w-12 h-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Add Equipment</h3>
              <p className="text-gray-500 text-center">
                Register new equipment to start inspections
              </p>
            </div>
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
      
      <div className="equipment-grid">
        {equipment.map(item => (
          <div key={item.id} className="card flex flex-col h-full">
            <div className="flex-1 mb-4">
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-gray-900">
                    {item.model}
                  </h2>
                  <p className="text-sm text-gray-600">
                    {item.type.replace('_', ' ')} • {item.serial}
                  </p>
                </div>
                <span className={`status-badge ${
                  item.status === 'OPERATIONAL' ? 'status-operational' :
                  item.status === 'MAINTENANCE' ? 'status-maintenance' :
                  item.status === 'OUT_OF_SERVICE' ? 'status-out_of_service' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {item.status.replace('_', ' ')}
                </span>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-gray-600">
                  <Icons.location className="w-4 h-4 flex-shrink-0" />
                  <span className="text-sm">{item.location}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Icons.timer className="w-4 h-4 flex-shrink-0" />
                  <span className="text-sm">{item.hoursUsed} hours</span>
                </div>
                {item.hasInProgressInspection ? (
                  <div className="flex items-center gap-2 text-amber-500">
                    <Icons.warning className="w-4 h-4 flex-shrink-0" />
                    <span className="text-sm font-semibold">Inspection in progress</span>
                  </div>
                ) : item.inspections && item.inspections[0] && (
                  <div className="flex items-center gap-2 text-green-600">
                    <Icons.checkCircle className="w-4 h-4 flex-shrink-0" />
                    <span className="text-sm">Last: {new Date(item.inspections[0].startedAt).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </div>
            
            {item.hasInProgressInspection ? (
              <Link href={`/inspect/${item.id}`} className="no-underline">
                <button className="btn btn-warning w-full">
                  Resume Inspection
                </button>
              </Link>
            ) : (
              <Link href={`/inspect/${item.id}/select-template`} className="no-underline">
                <button className="btn btn-primary w-full">
                  Start Inspection
                </button>
              </Link>
            )}
          </div>
        ))}
        
        {/* Add Equipment Card */}
        <Link href="/equipment/new" className="no-underline">
          <div className="card flex flex-col items-center justify-center min-h-[240px] cursor-pointer border-3 border-dashed border-blue-400 hover:border-blue-500 transition-all h-full">
            <Icons.addCircle className="w-12 h-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Add Equipment</h3>
            <p className="text-gray-500 text-center">
              Register new equipment
            </p>
          </div>
        </Link>
      </div>
    </div>
  )
}