import Link from 'next/link'
import { getTemplates } from '@/app/templates/actions'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const revalidate = 0

async function getEquipment(id: string) {
  try {
    return await prisma.equipment.findUnique({
      where: { id }
    })
  } catch (error) {
    console.error('Failed to fetch equipment:', error)
    return null
  }
}

export default async function SelectTemplatePage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id } = await params
  const equipment = await getEquipment(id)
  const allTemplates = await getTemplates()
  
  if (!equipment) {
    return (
      <div className="container">
        <div className="page-header">
          <h1 className="page-title">Equipment Not Found</h1>
          <p className="page-subtitle">
            The equipment you&apos;re looking for doesn&apos;t exist.
          </p>
          <Link href="/">
            <button className="btn btn-primary" style={{ marginTop: '20px' }}>
              Back to Equipment
            </button>
          </Link>
        </div>
      </div>
    )
  }
  
  // Show all templates, but sort relevant ones first
  const relevantTemplates = allTemplates.sort((a, b) => {
    // If equipment type matches, prioritize it
    const aMatches = a.equipmentType === equipment.type
    const bMatches = b.equipmentType === equipment.type
    if (aMatches && !bMatches) return -1
    if (!aMatches && bMatches) return 1
    
    // Then sort by default status
    if (a.isDefault && !b.isDefault) return -1
    if (!a.isDefault && b.isDefault) return 1
    
    // Finally sort by name
    return a.name.localeCompare(b.name)
  })

  // Find default template for this equipment type
  const defaultTemplate = relevantTemplates.find(t => 
    t.equipmentType === equipment.type && t.isDefault
  )

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
        <p className="page-subtitle">
          For {equipment.model} ({equipment.serial})
        </p>
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
                Quick Inspection
              </h2>
              <p style={{ fontSize: '14px', color: '#6B7280' }}>
                {defaultTemplate 
                  ? `Use default ${equipment.type.replace(/_/g, ' ').toLowerCase()} template`
                  : 'Use basic inspection template'
                }
              </p>
              {defaultTemplate && (
                <div style={{ fontSize: '13px', color: '#6B7280', marginTop: '12px' }}>
                  <span>{defaultTemplate.sections.length} sections</span>
                  <span style={{ margin: '0 8px' }}>•</span>
                  <span>
                    {defaultTemplate.sections.reduce((acc, section) => acc + section.checkpoints.length, 0)} checkpoints
                  </span>
                </div>
              )}
            </div>
            <button className="btn btn-primary" style={{ width: '100%' }}>
              Start Inspection
            </button>
          </div>
        </Link>

        {/* Custom Templates */}
        {relevantTemplates.map(template => {
          const isRecommended = template.equipmentType === equipment.type
          return (
            <Link 
              key={template.id} 
              href={`/inspect/${id}?template=${template.id}`}
              style={{ textDecoration: 'none' }}
            >
              <div className="card template-card" style={{ 
                cursor: 'pointer',
                border: isRecommended ? '2px solid #10B981' : undefined
              }}>
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: '600' }}>{template.name}</h2>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {isRecommended && (
                        <span className="status-badge" style={{ background: '#D1FAE5', color: '#065F46' }}>
                          RECOMMENDED
                        </span>
                      )}
                      {template.parentTemplateId && (
                        <span className="status-badge" style={{ background: '#F0F9FF', color: '#1E40AF' }}>
                          EXTENDED
                        </span>
                      )}
                      {template.isDefault && (
                        <span className="status-badge" style={{ background: '#DBEAFE', color: '#1E40AF' }}>
                          DEFAULT
                        </span>
                      )}
                    </div>
                  </div>
                  <p style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px' }}>
                    For: {template.equipmentType.replace(/_/g, ' ')}
                  </p>
                  {template.parentTemplateId && (
                    <p style={{ fontSize: '13px', color: '#1E40AF', marginBottom: '8px' }}>
                      ↳ Extends: {allTemplates.find(t => t.id === template.parentTemplateId)?.name || 'Parent template'}
                    </p>
                  )}
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
          )
        })}
      </div>

      {allTemplates.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '40px 20px', marginTop: '20px' }}>
          <p style={{ color: '#6B7280', marginBottom: '20px' }}>
            No custom templates available yet.
          </p>
          <Link href="/templates/new">
            <button className="btn btn-primary">
              Create Template
            </button>
          </Link>
        </div>
      )}
      
      {allTemplates.length > 0 && (
        <div style={{ textAlign: 'center', marginTop: '24px', paddingBottom: '24px' }}>
          <p style={{ fontSize: '14px', color: '#6B7280', marginBottom: '12px' }}>
            Showing {allTemplates.length} template{allTemplates.length !== 1 ? 's' : ''}
            {` for inspection of ${equipment.model}`}
          </p>
          <Link href="/templates/new">
            <button className="btn btn-secondary">
              + Create New Template
            </button>
          </Link>
        </div>
      )}
    </div>
  )
}