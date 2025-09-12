import Link from 'next/link'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const revalidate = 0

async function getEquipmentWithInspections(id: string) {
  try {
    return await prisma.equipment.findUnique({
      where: { id },
      include: {
        inspections: {
          orderBy: { startedAt: 'desc' },
          include: {
            technician: { select: { name: true, email: true } },
            sections: {
              include: {
                checkpoints: true
              }
            }
          }
        }
      }
    })
  } catch (error) {
    console.error('Failed to fetch equipment detail:', error)
    return null
  }
}

export default async function EquipmentDetailPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const equipment = await getEquipmentWithInspections(id)

  if (!equipment) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="card text-center py-10">Equipment not found</div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="mb-8">
        <div className="mb-6">
          <Link href="/">
            <button className="btn btn-secondary">← Back to Equipment</button>
          </Link>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{equipment.model}</h1>
            <p className="text-gray-600 mt-1">
              {equipment.type.replace(/_/g, ' ')} • {equipment.serial}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              Location: <strong>{equipment.location}</strong> • Hours: <strong>{equipment.hoursUsed}</strong>
            </p>
          </div>
          <div className="flex gap-3">
            <Link href={`/inspect/${equipment.id}/select-template`}>
              <button className="btn btn-primary">Start Inspection</button>
            </Link>
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Previous Inspections</h2>
        {equipment.inspections.length === 0 ? (
          <p className="text-gray-600">No previous inspections for this equipment.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', fontSize: '14px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #E5E7EB' }}>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Date</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Status</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Technician</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Issues</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {equipment.inspections.map((insp) => {
                  const checkpoints = insp.sections.flatMap(s => s.checkpoints)
                  const criticalIssues = checkpoints.filter(cp => cp.critical && cp.status === 'ACTION_REQUIRED').length
                  const nonCriticalIssues = checkpoints.filter(cp => !cp.critical && cp.status === 'ACTION_REQUIRED').length
                  const totalIssues = criticalIssues + nonCriticalIssues
                  return (
                    <tr key={insp.id} style={{ borderBottom: '1px solid #E5E7EB' }}>
                      <td style={{ padding: '12px' }}>{new Date(insp.startedAt).toLocaleString()}</td>
                      <td style={{ padding: '12px' }}>{insp.status.replace(/_/g, ' ')}</td>
                      <td style={{ padding: '12px' }}>{insp.technician?.name || 'Field Tech'}</td>
                      <td style={{ padding: '12px' }}>{totalIssues > 0 ? `${totalIssues} (${criticalIssues} critical)` : 'None'}</td>
                      <td style={{ padding: '12px' }}>
                        <div className="flex gap-2">
                          <Link href={`/inspections/${insp.id}`}>
                            <button className="btn btn-secondary text-sm">View</button>
                          </Link>
                          <Link href={`/api/inspections/${insp.id}/pdf`}>
                            <button className="btn btn-primary text-sm">Download PDF</button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}


