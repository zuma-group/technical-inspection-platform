import Link from 'next/link'
import { mockStorage } from '@/lib/mock-storage'

export const dynamic = 'force-dynamic'

async function getEquipment() {
  // Check if DATABASE_URL exists
  if (!process.env.DATABASE_URL) {
    console.log('Using mock data - DATABASE_URL not configured')
    return mockStorage.equipment.getAll()
  }

  try {
    const { prisma } = await import('@/lib/prisma')
    return await prisma.equipment.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        inspections: {
          orderBy: { startedAt: 'desc' },
          take: 1,
        },
      },
    })
  } catch (error) {
    console.error('Database connection failed, using mock data:', error)
    return mockStorage.equipment.getAll()
  }
}

export default async function HomePage() {
  const equipment = await getEquipment()

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
                    {item.type} • {item.serial}
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
                {item.inspections[0] && (
                  <div className="equipment-detail-item">
                    <span className="equipment-icon">✓</span>
                    <span>Last: {new Date(item.inspections[0].startedAt).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </div>
            
            <Link href={`/inspect/${item.id}/select-template`} style={{ textDecoration: 'none' }}>
              <button className="btn btn-primary" style={{ width: '100%' }}>
                Start Inspection
              </button>
            </Link>
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
            <div style={{
              fontSize: '48px',
              color: '#9CA3AF',
              marginBottom: '12px'
            }}>
              +
            </div>
            <p style={{ 
              fontSize: '16px', 
              fontWeight: '600',
              color: '#6B7280'
            }}>
              Add Equipment
            </p>
          </div>
        </Link>
      </div>
    </div>
  )
}