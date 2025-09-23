import Link from 'next/link'
import { getDashboardData } from './actions'
import { Icons, iconSizes } from '@/lib/icons'
import { getSession } from '@/lib/auth'
import { getUsers } from './actions'
import ManageUsers from '@/app/dashboard/manage-users'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function DashboardPage() {
  const [data, session] = await Promise.all([
    getDashboardData(),
    getSession()
  ])
  const isAdmin = session?.role === 'ADMIN'
  const usersData = isAdmin ? await getUsers() : { success: false, data: [] as any[] }
  
  // Calculate metrics
  const totalEquipment = data.equipment.length
  const operationalCount = data.equipment.filter(e => e.status === 'OPERATIONAL').length
  const maintenanceCount = data.equipment.filter(e => e.status === 'MAINTENANCE').length
  const outOfServiceCount = data.equipment.filter(e => e.status === 'OUT_OF_SERVICE' || e.status === 'OUT_SERVICE').length
  
  // Get recent inspections (last 30 days)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  
  const recentInspections = data.inspections
    .filter(i => new Date(i.startedAt) > thirtyDaysAgo)
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
    .slice(0, 10)
  
  // Find overdue equipment (not inspected in 30+ days)
  const overdueEquipment = data.equipment.filter(eq => {
    const lastInspection = eq.inspections?.[0]
    if (!lastInspection) return true
    const daysSinceInspection = Math.floor(
      (Date.now() - new Date(lastInspection.startedAt).getTime()) / (1000 * 60 * 60 * 24)
    )
    return daysSinceInspection > 30
  })

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="mb-8">
        <div className="mb-6">
          <Link href="/">
            <button className="btn btn-secondary inline-flex items-center gap-2 px-4 py-2">
              <Icons.back className={iconSizes.sm} />
              <span>Back to Equipment</span>
            </button>
          </Link>
        </div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Inspection Dashboard</h1>
            <p className="text-gray-600 mt-1">Overview of equipment inspections and status</p>
          </div>
          <div className="flex gap-3">
            <Link href="/templates">
              <button className="btn btn-secondary">
                Manage Templates
              </button>
            </Link>
            {isAdmin && (
              <a href="#users" className="no-underline">
                <button className="btn btn-secondary inline-flex items-center gap-2">
                  <Icons.userCheck className={iconSizes.sm} />
                  <span>Manage Users</span>
                </button>
              </a>
            )}
            <Link href="/equipment/new">
              <button className="btn btn-primary inline-flex items-center gap-2">
                <Icons.add className={iconSizes.sm} />
                <span>Add Equipment</span>
              </button>
            </Link>
          </div>
        </div>
      </div>

      {/* Metrics Cards - More compact */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div className="stat-card text-center py-4">
          <h3 className="text-xs text-gray-500 mb-1 font-semibold uppercase">
            TOTAL EQUIPMENT
          </h3>
          <p className="text-2xl font-bold text-gray-900">
            {totalEquipment}
          </p>
        </div>

        <div className="stat-card text-center py-4">
          <h3 className="text-xs text-gray-500 mb-1 font-semibold uppercase">
            OPERATIONAL
          </h3>
          <p className="text-2xl font-bold text-green-500">
            {operationalCount}
          </p>
          <p className="text-xs text-gray-600">
            {Math.round((operationalCount / totalEquipment) * 100)}% of fleet
          </p>
        </div>

        <div className="stat-card text-center py-4">
          <h3 className="text-xs text-gray-500 mb-1 font-semibold uppercase">
            NEEDS ATTENTION
          </h3>
          <p className="text-2xl font-bold text-amber-500">
            {maintenanceCount}
          </p>
          <p className="text-xs text-gray-600">
            In maintenance
          </p>
        </div>

        <div className="stat-card text-center py-4">
          <h3 className="text-xs text-gray-500 mb-1 font-semibold uppercase">
            OUT OF SERVICE
          </h3>
          <p className="text-2xl font-bold text-red-500">
            {outOfServiceCount}
          </p>
          <p className="text-xs text-gray-600">
            Requires repair
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {isAdmin && (
          <div id="users" className="card">
            <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
              <Icons.userCheck className={iconSizes.sm} />
              User Management
            </h2>
            <ManageUsers initialUsers={usersData.success ? usersData.data : []} currentUserId={session!.userId} />
          </div>
        )}
        {/* Equipment Status Chart */}
        <div className="card">
          <h2 className="text-base font-semibold mb-4">
            Equipment Status Distribution
          </h2>
          <div className="space-y-4">
            {/* Simple bar chart */}
            <div className="w-full">
              <div className="flex h-8 rounded-lg overflow-hidden mb-3">
                {operationalCount > 0 && (
                  <div 
                    className="bg-green-500 flex items-center justify-center text-white font-semibold text-sm"
                    style={{ width: `${(operationalCount / totalEquipment) * 100}%` }}
                  >
                    {operationalCount}
                  </div>
                )}
                {maintenanceCount > 0 && (
                  <div 
                    className="bg-amber-500 flex items-center justify-center text-white font-semibold text-sm"
                    style={{ width: `${(maintenanceCount / totalEquipment) * 100}%` }}
                  >
                    {maintenanceCount}
                  </div>
                )}
                {outOfServiceCount > 0 && (
                  <div 
                    className="bg-red-500 flex items-center justify-center text-white font-semibold text-sm"
                    style={{ width: `${(outOfServiceCount / totalEquipment) * 100}%` }}
                  >
                    {outOfServiceCount}
                  </div>
                )}
              </div>
              
              {/* Legend */}
              <div className="flex gap-4 flex-wrap text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded"></div>
                  <span className="text-gray-600">Operational</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-amber-500 rounded"></div>
                  <span className="text-gray-600">Maintenance</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded"></div>
                  <span className="text-gray-600">Out of Service</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Inspections and Overdue Equipment in 2-column grid on larger screens */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Recent Inspections */}
          <div className="card">
          <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px' }}>
            Recent Inspections
          </h2>
          {recentInspections.length === 0 ? (
            <p style={{ color: '#6B7280', textAlign: 'center', padding: '20px' }}>
              No inspections in the last 30 days
            </p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', fontSize: '14px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #E5E7EB' }}>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Equipment</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Date</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Status</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Technician</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Issues</th>
                  </tr>
                </thead>
                <tbody>
                  {recentInspections.map((inspection) => {
                    const equipment = data.equipment.find(e => e.id === inspection.equipmentId)
                    const issueCount = inspection.criticalIssues + inspection.nonCriticalIssues
                    
                    return (
                      <tr key={inspection.id} style={{ borderBottom: '1px solid #E5E7EB' }}>
                        <td style={{ padding: '12px' }}>
                          <div>
                            <div style={{ fontWeight: '600' }}>{equipment?.model || 'Unknown'}</div>
                            <div style={{ fontSize: '12px', color: '#6B7280' }}>{equipment?.serial}</div>
                          </div>
                        </td>
                        <td style={{ padding: '12px' }}>
                          {require('@/lib/time').formatPDTDate(inspection.startedAt)}
                        </td>
                        <td style={{ padding: '12px' }}>
                          <span className={`status-badge ${
                            inspection.status === 'COMPLETED' ? 'status-operational' : 'status-inspection'
                          }`}>
                            {inspection.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td style={{ padding: '12px' }}>
                          {inspection.technicianName || 'Field Tech'}
                        </td>
                        <td style={{ padding: '12px' }}>
                          {issueCount > 0 ? (
                            <div>
                              {inspection.criticalIssues > 0 && (
                                <span style={{ color: '#EF4444', fontWeight: '600' }}>
                                  {inspection.criticalIssues} critical
                                </span>
                              )}
                              {inspection.criticalIssues > 0 && inspection.nonCriticalIssues > 0 && ', '}
                              {inspection.nonCriticalIssues > 0 && (
                                <span style={{ color: '#F59E0B' }}>
                                  {inspection.nonCriticalIssues} minor
                                </span>
                              )}
                            </div>
                          ) : (
                            <span style={{ color: '#10B981' }}>None</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Overdue Inspections */}
        <div className="card">
          <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px' }}>
            Equipment Requiring Inspection
            {overdueEquipment.length > 0 && (
              <span style={{ 
                marginLeft: '12px',
                padding: '4px 8px',
                background: '#FEE2E2',
                color: '#991B1B',
                borderRadius: '4px',
                fontSize: '14px',
                fontWeight: '600'
              }}>
                {overdueEquipment.length} OVERDUE
              </span>
            )}
          </h2>
          {overdueEquipment.length === 0 ? (
            <p className="text-green-500 text-center p-5 flex items-center justify-center gap-2">
              <Icons.checkCircle className={iconSizes.md} />
              <span>All equipment inspections are up to date</span>
            </p>
          ) : (
            <div style={{ display: 'grid', gap: '12px' }}>
              {overdueEquipment.map((equipment) => {
                const lastInspection = equipment.inspections?.[0]
                const daysSince = lastInspection 
                  ? Math.floor((Date.now() - new Date(lastInspection.startedAt).getTime()) / (1000 * 60 * 60 * 24))
                  : null
                
                return (
                  <div key={equipment.id} style={{ 
                    padding: '12px',
                    background: '#FEF2F2',
                    borderRadius: '8px',
                    border: '1px solid #FECACA',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '12px'
                  }}>
                    <div>
                      <div style={{ fontWeight: '600', marginBottom: '4px' }}>{equipment.model}</div>
                      <div style={{ fontSize: '13px', color: '#6B7280' }}>
                        {equipment.type} • {equipment.serial}
                      </div>
                      <div style={{ fontSize: '12px', color: '#991B1B', marginTop: '4px' }}>
                        {daysSince 
                          ? `Last inspected ${daysSince} days ago`
                          : 'Never inspected'
                        }
                      </div>
                    </div>
                    <Link href={`/inspect/${equipment.id}/select-template`}>
                      <button className="btn btn-danger" style={{ padding: '8px 16px' }}>
                        Inspect Now
                      </button>
                    </Link>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}