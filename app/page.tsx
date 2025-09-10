import { prisma } from '@/lib/prisma'
import Link from 'next/link'

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
        <h1 style={{ 
          fontSize: '24px', 
          fontWeight: 'bold',
          '@media (min-width: 768px)': { fontSize: '32px' },
          '@media (min-width: 1024px)': { fontSize: '36px' }
        }}>
          Equipment Inspection Platform
        </h1>
        <p style={{ 
          color: '#6B7280', 
          marginTop: '8px',
          fontSize: '14px',
          '@media (min-width: 768px)': { fontSize: '16px' }
        }}>
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
                    <h2 style={{ 
                      fontSize: '18px', 
                      fontWeight: '600',
                      marginBottom: '4px',
                      '@media (min-width: 768px)': { fontSize: '20px' }
                    }}>
                      {item.model}
                    </h2>
                    <p style={{ 
                      fontSize: '14px', 
                      color: '#6B7280',
                      '@media (min-width: 768px)': { fontSize: '15px' }
                    }}>
                      {item.type} • {item.serial}
                    </p>
                  </div>
                  <span className={`status-badge status-${item.status.toLowerCase().replace('_', '-')}`}>
                    {item.status.replace('_', ' ')}
                  </span>
                </div>
                
                <div style={{ 
                  marginTop: '16px', 
                  fontSize: '14px', 
                  color: '#6B7280',
                  display: 'grid',
                  gap: '8px',
                  '@media (min-width: 768px)': { fontSize: '15px' }
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '16px' }}>📍</span>
                    <span>{item.location}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '16px' }}>⏱️</span>
                    <span>{item.hoursUsed} hours</span>
                  </div>
                  {item.inspections[0] && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '16px' }}>✓</span>
                      <span>Last: {new Date(item.inspections[0].startedAt).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </div>
              
              <Link href={`/inspect/${item.id}`} style={{ textDecoration: 'none' }}>
                <button className="btn btn-primary" style={{ 
                  width: '100%',
                  '@media (min-width: 768px)': { 
                    fontSize: '16px',
                    padding: '16px 24px'
                  }
                }}>
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