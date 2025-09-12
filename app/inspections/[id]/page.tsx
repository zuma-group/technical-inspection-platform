import Link from 'next/link'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

async function getInspection(id: string) {
  try {
    return await prisma.inspection.findUnique({
      where: { id },
      include: {
        equipment: true,
        technician: { select: { name: true, email: true } },
        sections: {
          orderBy: { order: 'asc' },
          include: {
            checkpoints: {
              orderBy: { order: 'asc' },
              include: { media: true }
            }
          }
        }
      }
    })
  } catch (error) {
    console.error('Failed to fetch inspection:', error)
    return null
  }
}

export default async function InspectionDetailPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const inspection = await getInspection(id)

  if (!inspection) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="card text-center py-10">Inspection not found</div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="mb-6 flex justify-between items-center">
        <Link href={`/equipment/${inspection.equipmentId}`}>
          <button className="btn btn-secondary">← Back to Equipment</button>
        </Link>
        <Link href={`/api/inspections/${inspection.id}/pdf`}>
          <button className="btn btn-primary">Download PDF</button>
        </Link>
      </div>

      <div className="card mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Inspection</h1>
        <p className="text-gray-600">
          {inspection.equipment.model} • {inspection.equipment.serial}
        </p>
        <p className="text-sm text-gray-600 mt-1">
          {new Date(inspection.startedAt).toLocaleString()} • Status: {inspection.status.replace(/_/g, ' ')}
        </p>
      </div>

      {inspection.sections.map((section) => (
        <div key={section.id} className="card mb-4">
          <h2 className="text-lg font-semibold mb-3">{section.name}</h2>
          <div className="space-y-2">
            {section.checkpoints.map(cp => (
              <div key={cp.id} className="flex justify-between items-start p-3 border-2 border-gray-200 rounded-lg">
                <div>
                  <div className="font-medium text-gray-900">{cp.name}</div>
                  {cp.notes && (
                    <div className="text-sm text-gray-600 mt-1">Notes: {cp.notes}</div>
                  )}
                </div>
                <span className={`status-badge ${
                  cp.status === 'PASS' ? 'status-operational' :
                  cp.status === 'CORRECTED' ? 'status-maintenance' :
                  cp.status === 'ACTION_REQUIRED' ? 'status-out_of_service' : 'bg-gray-100 text-gray-800'
                }`}>
                  {cp.status ?? 'N/A'}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}


