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
  
  // Gather template names for inspections that reference a template
  let templateNameById: Record<string, string> = {}
  if (equipment?.inspections?.length) {
    const templateIds = Array.from(
      new Set(
        equipment.inspections
          .map((i: any) => i.templateId)
          .filter((v: string | null | undefined): v is string => Boolean(v))
      )
    )
    if (templateIds.length > 0) {
      const templates = await (prisma as any).inspectionTemplate.findMany({
        where: { id: { in: templateIds } },
        select: { id: true, name: true }
      })
      templateNameById = Object.fromEntries(templates.map((t: any) => [t.id, t.name]))
    }
  }

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
            {equipment.inspections.some(insp => insp.status === 'IN_PROGRESS') ? (
              <button className="btn btn-primary opacity-50 cursor-not-allowed" disabled>
                Start Inspection
              </button>
            ) : (
              <Link href={`/inspect/${equipment.id}/select-template`}>
                <button className="btn btn-primary">Start Inspection</button>
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Previous Inspections</h2>
        {equipment.inspections.length === 0 ? (
          <p className="text-gray-600">No previous inspections for this equipment.</p>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block" style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', fontSize: '14px', tableLayout: 'fixed' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #E5E7EB' }}>
                    <th style={{ width: '14.2857%', padding: '12px', textAlign: 'left' }}>Date</th>
                    <th style={{ width: '14.2857%', padding: '12px', textAlign: 'left' }}>Status</th>
                    <th style={{ width: '14.2857%', padding: '12px', textAlign: 'left' }}>Type</th>
                    <th style={{ width: '14.2857%', padding: '12px', textAlign: 'left' }}>Technician</th>
                    <th style={{ width: '14.2857%', padding: '12px', textAlign: 'left' }}>Issues</th>
                    <th style={{ width: '28.5714%', padding: '12px', textAlign: 'left' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {equipment.inspections.map((insp) => {
                    const checkpoints = insp.sections.flatMap(s => s.checkpoints)
                    const criticalIssues = checkpoints.filter(cp => cp.critical && cp.status === 'ACTION_REQUIRED').length
                    const nonCriticalIssues = checkpoints.filter(cp => !cp.critical && cp.status === 'ACTION_REQUIRED').length
                    const totalIssues = criticalIssues + nonCriticalIssues
                    const templateName = templateNameById[(insp as any).templateId as string]
                    const completedCheckpoints = checkpoints.filter(cp => cp.status).length
                    const totalCheckpoints = checkpoints.length
                    const progressPercentage = totalCheckpoints > 0 ? Math.round((completedCheckpoints / totalCheckpoints) * 100) : 0
                    return (
                      <tr key={insp.id} style={{ borderBottom: '1px solid #E5E7EB' }}>
                        <td style={{ width: '14.2857%', padding: '12px', wordBreak: 'break-word' }}>
                          <div>{require('@/lib/time').formatPDTDate(insp.startedAt)}</div>
                          <div className="text-xs text-gray-500 mt-1">{require('@/lib/time').formatPDTTime(insp.startedAt)}</div>
                        </td>
                        <td style={{ width: '14.2857%', padding: '12px', wordBreak: 'break-word' }}>
                          <div className="mb-2">{insp.status.replace(/_/g, ' ')}</div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full transition-all duration-300 ${
                                progressPercentage === 100 ? 'bg-green-500' : 
                                progressPercentage > 0 ? 'bg-blue-500' : 'bg-gray-300'
                              }`}
                              style={{ width: `${progressPercentage}%` }}
                            />
                          </div>
                          <div className="text-xs text-gray-600 mt-1">{progressPercentage}% complete</div>
                        </td>
                        <td style={{ width: '14.2857%', padding: '12px', wordBreak: 'break-word' }}>{templateName || equipment.type.replace(/_/g, ' ')}</td>
                        <td style={{ width: '14.2857%', padding: '12px', wordBreak: 'break-word' }}>{insp.technician?.name || 'Field Tech'}</td>
                        <td style={{ width: '14.2857%', padding: '12px', wordBreak: 'break-word' }}>{totalIssues > 0 ? `${totalIssues} (${criticalIssues} critical)` : 'None'}</td>
                        <td style={{ width: '28.5714%', padding: '12px' }}>
                          <div className="flex gap-2 items-center" style={{ whiteSpace: 'nowrap' }}>
                            <Link href={`/inspections/${insp.id}`}>
                              <button className="btn btn-secondary text-sm">View</button>
                            </Link>
                            {insp.status === 'IN_PROGRESS' && (
                              <Link href={`/inspect/${equipment.id}`}>
                                <button className="btn btn-warning text-sm">Continue Inspection</button>
                              </Link>
                            )}
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

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
              {equipment.inspections.map((insp) => {
                const checkpoints = insp.sections.flatMap(s => s.checkpoints)
                const criticalIssues = checkpoints.filter(cp => cp.critical && cp.status === 'ACTION_REQUIRED').length
                const nonCriticalIssues = checkpoints.filter(cp => !cp.critical && cp.status === 'ACTION_REQUIRED').length
                const totalIssues = criticalIssues + nonCriticalIssues
                const templateName = templateNameById[(insp as any).templateId as string]
                const completedCheckpoints = checkpoints.filter(cp => cp.status).length
                const totalCheckpoints = checkpoints.length
                const progressPercentage = totalCheckpoints > 0 ? Math.round((completedCheckpoints / totalCheckpoints) * 100) : 0
                return (
                  <div key={insp.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex justify-between items-start mb-3">
                      <div className="text-sm font-medium text-gray-900">
                        {require('@/lib/time').formatPDTDate(insp.startedAt)}
                      </div>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        insp.status === 'IN_PROGRESS' ? 'bg-yellow-100 text-yellow-800' :
                        insp.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {insp.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="mb-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-gray-600">Progress:</span>
                        <span className="text-sm font-medium">{progressPercentage}% complete</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div 
                          className={`h-3 rounded-full transition-all duration-300 ${
                            progressPercentage === 100 ? 'bg-green-500' : 
                            progressPercentage > 0 ? 'bg-blue-500' : 'bg-gray-300'
                          }`}
                          style={{ width: `${progressPercentage}%` }}
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Type:</span>
                        <span className="font-medium">{templateName || equipment.type.replace(/_/g, ' ')}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Technician:</span>
                        <span className="font-medium">{insp.technician?.name || 'Field Tech'}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Issues:</span>
                        <span className="font-medium">{totalIssues > 0 ? `${totalIssues} (${criticalIssues} critical)` : 'None'}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Link href={`/inspections/${insp.id}`}>
                        <button className="btn btn-secondary text-sm flex-1 min-w-[80px]">View</button>
                      </Link>
                      {insp.status === 'IN_PROGRESS' && (
                        <Link href={`/inspect/${equipment.id}`}>
                          <button className="btn btn-warning text-sm flex-1 min-w-[120px]">Continue</button>
                        </Link>
                      )}
                      <Link href={`/api/inspections/${insp.id}/pdf`}>
                        <button className="btn btn-primary text-sm flex-1 min-w-[100px]">PDF</button>
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}


