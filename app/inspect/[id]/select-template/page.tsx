import Link from 'next/link'
import { getTemplates } from '@/app/templates/actions'
import { mockEquipment } from '@/lib/mock-data'

export const dynamic = 'force-dynamic'

async function getEquipment(id: string) {
  if (!process.env.DATABASE_URL) {
    return mockEquipment.find(e => e.id === id)
  }
  
  try {
    const { prisma } = await import('@/lib/prisma')
    return await prisma.equipment.findUnique({
      where: { id }
    })
  } catch {
    return mockEquipment.find(e => e.id === id)
  }
}

export default async function SelectTemplatePage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id } = await params
  const equipment = await getEquipment(id)
  const templates = await getTemplates()
  
  // Filter templates by equipment type if available
  const relevantTemplates = equipment 
    ? templates.filter(t => t.equipmentType === equipment.type || t.equipmentType === 'OTHER')
    : templates

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
        <h1 className="page-title">Select Inspection Template</h1>
        {equipment && (
          <p className="page-subtitle">
            For {equipment.model} ({equipment.serial})
          </p>
        )}
      </div>

      <div className="templates-grid">
        {/* Default Template Option */}
        <Link href={`/inspect/${id}`} style={{ textDecoration: 'none' }}>
          <div className="card template-card" style={{ 
            border: '2px solid #2563EB',
            cursor: 'pointer'
          }}>
            <div style={{ marginBottom: '16px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>
                Standard Inspection
              </h2>
              <p style={{ fontSize: '14px', color: '#6B7280' }}>
                Use the default inspection template
              </p>
              <div style={{ fontSize: '13px', color: '#6B7280', marginTop: '12px' }}>
                <span>5 sections</span>
                <span style={{ margin: '0 8px' }}>•</span>
                <span>25 checkpoints</span>
              </div>
            </div>
            <button className="btn btn-primary" style={{ width: '100%' }}>
              Use Default
            </button>
          </div>
        </Link>

        {/* Custom Templates */}
        {relevantTemplates.map(template => (
          <Link 
            key={template.id} 
            href={`/inspect/${id}?template=${template.id}`}
            style={{ textDecoration: 'none' }}
          >
            <div className="card template-card" style={{ cursor: 'pointer' }}>
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                  <h2 style={{ fontSize: '18px', fontWeight: '600' }}>{template.name}</h2>
                  {template.isDefault && (
                    <span className="status-badge" style={{ background: '#DBEAFE', color: '#1E40AF' }}>
                      DEFAULT
                    </span>
                  )}
                </div>
                <p style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px' }}>
                  {template.equipmentType.replace('_', ' ')}
                </p>
                {template.description && (
                  <p style={{ fontSize: '13px', color: '#9CA3AF', marginBottom: '12px' }}>
                    {template.description}
                  </p>
                )}
                <div style={{ fontSize: '13px', color: '#6B7280' }}>
                  <span>{template.sections.length} sections</span>
                  <span style={{ margin: '0 8px' }}>•</span>
                  <span>
                    {template.sections.reduce((acc, section) => acc + section.checkpoints.length, 0)} checkpoints
                  </span>
                </div>
              </div>
              <button className="btn btn-secondary" style={{ width: '100%' }}>
                Use Template
              </button>
            </div>
          </Link>
        ))}
      </div>

      {relevantTemplates.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '40px 20px', marginTop: '20px' }}>
          <p style={{ color: '#6B7280', marginBottom: '20px' }}>
            No custom templates available for this equipment type.
          </p>
          <Link href="/templates/new">
            <button className="btn btn-primary">
              Create Template
            </button>
          </Link>
        </div>
      )}
    </div>
  )
}