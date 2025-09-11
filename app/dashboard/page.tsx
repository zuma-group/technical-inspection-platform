import Link from 'next/link'
import { getDashboardData } from './actions'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function DashboardPage() {
  const data = await getDashboardData()
  
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
    <div className="container">
      <div className="page-header">
        <div style={{ marginBottom: '24px' }}>
          <Link href="/">
            <button className="btn btn-secondary" style={{ padding: '8px 16px' }}>
              ← Back to Equipment
            </button>
          </Link>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 className="page-title">Inspection Dashboard</h1>
            <p className="page-subtitle">Overview of equipment inspections and status</p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <Link href="/templates">
              <button className="btn btn-secondary">
                Manage Templates
              </button>
            </Link>
            <Link href="/equipment/new">
              <button className="btn btn-primary">
                + Add Equipment
              </button>
            </Link>
          </div>
        </div>
      </div>

      {/* Metrics Cards */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '20px',
        marginBottom: '32px'
      }}>
        <div className="card" style={{ textAlign: 'center' }}>
          <h3 style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px', fontWeight: '600' }}>
            TOTAL EQUIPMENT
          </h3>
          <p style={{ fontSize: '36px', fontWeight: '700', color: '#111827' }}>
            {totalEquipment}
          </p>
        </div>

        <div className="card" style={{ textAlign: 'center' }}>
          <h3 style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px', fontWeight: '600' }}>
            OPERATIONAL
          </h3>
          <p style={{ fontSize: '36px', fontWeight: '700', color: '#10B981' }}>
            {operationalCount}
          </p>
          <p style={{ fontSize: '13px', color: '#6B7280' }}>
            {Math.round((operationalCount / totalEquipment) * 100)}% of fleet
          </p>
        </div>

        <div className="card" style={{ textAlign: 'center' }}>
          <h3 style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px', fontWeight: '600' }}>
            NEEDS ATTENTION
          </h3>
          <p style={{ fontSize: '36px', fontWeight: '700', color: '#F59E0B' }}>
            {maintenanceCount}
          </p>
          <p style={{ fontSize: '13px', color: '#6B7280' }}>
            In maintenance
          </p>
        </div>

        <div className="card" style={{ textAlign: 'center' }}>
          <h3 style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px', fontWeight: '600' }}>
            OUT OF SERVICE
          </h3>
          <p style={{ fontSize: '36px', fontWeight: '700', color: '#EF4444' }}>
            {outOfServiceCount}
          </p>
          <p style={{ fontSize: '13px', color: '#6B7280' }}>
            Requires repair
          </p>
        </div>
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr',
        gap: '24px'
      }}>
        {/* Equipment Status Chart */}
        <div className="card">
          <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px' }}>
            Equipment Status Distribution
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '32px', flexWrap: 'wrap' }}>
            {/* Simple bar chart */}
            <div style={{ flex: 1, minWidth: '200px' }}>
              <div style={{ 
                display: 'flex', 
                height: '30px', 
                borderRadius: '8px',
                overflow: 'hidden',
                marginBottom: '20px'
              }}>
                {operationalCount > 0 && (
                  <div style={{
                    width: `${(operationalCount / totalEquipment) * 100}%`,
                    background: '#10B981',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: '600',
                    fontSize: '14px'
                  }}>
                    {operationalCount > 0 && `${operationalCount}`}
                  </div>
                )}
                {maintenanceCount > 0 && (
                  <div style={{
                    width: `${(maintenanceCount / totalEquipment) * 100}%`,
                    background: '#F59E0B',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: '600',
                    fontSize: '14px'
                  }}>
                    {maintenanceCount > 0 && `${maintenanceCount}`}
                  </div>
                )}
                {outOfServiceCount > 0 && (
                  <div style={{
                    width: `${(outOfServiceCount / totalEquipment) * 100}%`,
                    background: '#EF4444',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: '600',
                    fontSize: '14px'
                  }}>
                    {outOfServiceCount > 0 && `${outOfServiceCount}`}
                  </div>
                )}
              </div>
              
              {/* Legend */}
              <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '12px', height: '12px', background: '#10B981', borderRadius: '2px' }}></div>
                  <span style={{ fontSize: '14px', color: '#6B7280' }}>Operational</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '12px', height: '12px', background: '#F59E0B', borderRadius: '2px' }}></div>
                  <span style={{ fontSize: '14px', color: '#6B7280' }}>Maintenance</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '12px', height: '12px', background: '#EF4444', borderRadius: '2px' }}></div>
                  <span style={{ fontSize: '14px', color: '#6B7280' }}>Out of Service</span>
                </div>
              </div>
            </div>
          </div>
        </div>

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
                          {new Date(inspection.startedAt).toLocaleDateString()}
                        </td>
                        <td style={{ padding: '12px' }}>
                          <span className={`status-badge ${
                            inspection.status === 'COMPLETED' ? 'status-operational' : 'status-inspection'
                          }`}>
                            {inspection.status}
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
            <p style={{ color: '#10B981', textAlign: 'center', padding: '20px' }}>
              ✓ All equipment inspections are up to date
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
  )
}