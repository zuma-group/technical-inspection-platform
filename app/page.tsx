import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { InspectionStatus } from '@prisma/client'

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
      <div className="container">
        <div className="page-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h1 className="page-title">
                Equipment Inspection Platform
              </h1>
              <p className="page-subtitle">
                No equipment found. Add equipment to begin.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <Link href="/dashboard">
                <button className="btn btn-primary">
                  📊 Dashboard
                </button>
              </Link>
              <Link href="/templates">
                <button className="btn btn-secondary">
                  ⚙️ Templates
                </button>
              </Link>
            </div>
          </div>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '48px' }}>
          <Link href="/equipment/new" style={{ textDecoration: 'none' }}>
            <div className="card" style={{ 
              display: 'flex', 
              flexDirection: 'column',
              alignItems: 'center', 
              justifyContent: 'center',
              minHeight: '240px',
              cursor: 'pointer',
              border: '2px dashed #D1D5DB',
              transition: 'all 0.2s',
              padding: '32px',
              maxWidth: '400px'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>➕</div>
              <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>Add Equipment</h3>
              <p style={{ color: '#6B7280', textAlign: 'center' }}>
                Register new equipment to start inspections
              </p>
            </div>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 className="page-title">
              Equipment Inspection Platform
            </h1>
            <p className="page-subtitle">
              Select equipment to begin inspection
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <Link href="/dashboard">
              <button className="btn btn-primary">
                📊 Dashboard
              </button>
            </Link>
            <Link href="/templates">
              <button className="btn btn-secondary">
                ⚙️ Templates
              </button>
            </Link>
          </div>
        </div>
      </div>
      
      <div className="equipment-grid">
        {equipment.map(item => (
          <div key={item.id} className="card" style={{ 
            display: 'flex', 
            flexDirection: 'column',
            height: '100%'
          }}>
            <div style={{ flex: 1, marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                <div style={{ flex: 1 }}>
                  <h2 className="equipment-title">
                    {item.model}
                  </h2>
                  <p className="equipment-subtitle">
                    {item.type.replace('_', ' ')} • {item.serial}
                  </p>
                </div>
                <span className={`status-badge status-${item.status.toLowerCase().replace('_', '-')}`}>
                  {item.status.replace('_', ' ')}
                </span>
              </div>
              
              <div className="equipment-details">
                <div className="equipment-detail-item">
                  <span className="equipment-icon">📍</span>
                  <span>{item.location}</span>
                </div>
                <div className="equipment-detail-item">
                  <span className="equipment-icon">⏱️</span>
                  <span>{item.hoursUsed} hours</span>
                </div>
                {item.hasInProgressInspection ? (
                  <div className="equipment-detail-item" style={{ color: '#F59E0B' }}>
                    <span className="equipment-icon">⚠️</span>
                    <span style={{ fontWeight: '600' }}>Inspection in progress</span>
                  </div>
                ) : item.inspections && item.inspections[0] && (
                  <div className="equipment-detail-item">
                    <span className="equipment-icon">✓</span>
                    <span>Last: {new Date(item.inspections[0].startedAt).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </div>
            
            {item.hasInProgressInspection ? (
              <Link href={`/inspect/${item.id}`} style={{ textDecoration: 'none' }}>
                <button className="btn btn-warning" style={{ width: '100%' }}>
                  Resume Inspection
                </button>
              </Link>
            ) : (
              <Link href={`/inspect/${item.id}/select-template`} style={{ textDecoration: 'none' }}>
                <button className="btn btn-primary" style={{ width: '100%' }}>
                  Start Inspection
                </button>
              </Link>
            )}
          </div>
        ))}
        
        {/* Add Equipment Card */}
        <Link href="/equipment/new" style={{ textDecoration: 'none' }}>
          <div className="card" style={{ 
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'center', 
            justifyContent: 'center',
            minHeight: '240px',
            cursor: 'pointer',
            border: '2px dashed #D1D5DB',
            transition: 'all 0.2s',
            height: '100%'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>➕</div>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>Add Equipment</h3>
            <p style={{ color: '#6B7280', textAlign: 'center' }}>
              Register new equipment
            </p>
          </div>
        </Link>
      </div>
    </div>
  )
}