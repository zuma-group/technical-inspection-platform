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
    <div className="container" style={{ paddingTop: '16px' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px' }}>
        Equipment
      </h1>
      
      {equipment.length === 0 ? (
        <div className="card">
          <p style={{ textAlign: 'center', color: '#6B7280' }}>
            No equipment found. Add equipment to the database.
          </p>
        </div>
      ) : (
        equipment.map(item => (
          <div key={item.id} className="card">
            <div style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: '600' }}>{item.model}</h2>
                  <p style={{ fontSize: '14px', color: '#6B7280', marginTop: '4px' }}>
                    {item.type} • {item.serial}
                  </p>
                </div>
                <span className={`status-badge status-${item.status.toLowerCase().replace('_', '-')}`}>
                  {item.status.replace('_', ' ')}
                </span>
              </div>
              
              <div style={{ marginTop: '12px', fontSize: '14px', color: '#6B7280' }}>
                <p>📍 {item.location}</p>
                <p>⏱️ {item.hoursUsed} hours</p>
                {item.inspections[0] && (
                  <p>✓ Last inspection: {new Date(item.inspections[0].startedAt).toLocaleDateString()}</p>
                )}
              </div>
            </div>
            
            <Link href={`/inspect/${item.id}`}>
              <button className="btn btn-primary" style={{ width: '100%' }}>
                Start Inspection
              </button>
            </Link>
          </div>
        ))
      )}
    </div>
  )
}