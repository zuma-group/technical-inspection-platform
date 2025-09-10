import { prisma } from '@/lib/prisma'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

async function getEquipment() {
  return await prisma.equipment.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      inspections: {
        orderBy: { startedAt: 'desc' },
        take: 1,
      },
    },
  })
}

export default async function HomePage() {
  const equipment = await getEquipment()

  return (
    <div className="container">
      <div className="page-header">
        <h1 className="page-title">
          Equipment Inspection Platform
        </h1>
        <p className="page-subtitle">
          Select equipment to begin inspection
        </p>
      </div>
      
      {equipment.length === 0 ? (
        <div className="card" style={{ maxWidth: '600px', margin: '0 auto' }}>
          <p style={{ textAlign: 'center', color: '#6B7280', padding: '40px 20px' }}>
            No equipment found. Add equipment to the database.
          </p>
        </div>
      ) : (
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
              
              <Link href={`/inspect/${item.id}`} style={{ textDecoration: 'none' }}>
                <button className="btn btn-primary" style={{ width: '100%' }}>
                  Start Inspection
                </button>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}