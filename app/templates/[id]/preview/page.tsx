import Link from 'next/link'
import { getTemplate } from '../../actions'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function PreviewTemplatePage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id } = await params
  const template = await getTemplate(id)
  
  if (!template) {
    notFound()
  }

  const totalCheckpoints = template.sections.reduce(
    (acc, section) => acc + section.checkpoints.length, 
    0
  )

  const criticalCheckpoints = template.sections.reduce(
    (acc, section) => acc + section.checkpoints.filter(cp => cp.critical).length, 
    0
  )

  return (
    <div className="container">
      <div className="page-header">
        <div style={{ marginBottom: '24px' }}>
          <Link href="/templates">
            <button className="btn btn-secondary" style={{ padding: '8px 16px' }}>
              ← Back to Templates
            </button>
          </Link>
        </div>
        <div>
          <h1 className="page-title">{template.name}</h1>
          {template.description && (
            <p className="page-subtitle">{template.description}</p>
          )}
          <div style={{ 
            display: 'flex', 
            gap: '20px', 
            marginTop: '16px',
            fontSize: '14px',
            color: '#6B7280'
          }}>
            <span>Equipment Type: <strong>{template.equipmentType.replace('_', ' ')}</strong></span>
            <span>Sections: <strong>{template.sections.length}</strong></span>
            <span>Total Checkpoints: <strong>{totalCheckpoints}</strong></span>
            <span>Critical: <strong>{criticalCheckpoints}</strong></span>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '24px' }}>
        {template.sections.map((section, sectionIndex) => (
          <div key={section.id} className="card" style={{ marginBottom: '20px' }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px',
              marginBottom: '16px',
              paddingBottom: '12px',
              borderBottom: '2px solid #E5E7EB'
            }}>
              <span style={{ 
                background: '#2563EB',
                color: 'white',
                padding: '4px 12px',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '600'
              }}>
                {section.code}
              </span>
              <h2 style={{ fontSize: '18px', fontWeight: '600', flex: 1 }}>
                {section.name}
              </h2>
              <span style={{ fontSize: '14px', color: '#6B7280' }}>
                {section.checkpoints.length} checkpoints
              </span>
            </div>

            <div style={{ display: 'grid', gap: '8px' }}>
              {section.checkpoints.map((checkpoint, cpIndex) => (
                <div 
                  key={checkpoint.id}
                  style={{ 
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '8px 12px',
                    background: '#F9FAFB',
                    borderRadius: '6px',
                    border: checkpoint.critical ? '1px solid #FCA5A5' : '1px solid #E5E7EB'
                  }}
                >
                  <span style={{ 
                    fontSize: '13px',
                    color: '#6B7280',
                    minWidth: '60px'
                  }}>
                    {checkpoint.code}
                  </span>
                  <span style={{ flex: 1, fontSize: '14px' }}>
                    {checkpoint.name}
                  </span>
                  {checkpoint.critical && (
                    <span className="critical-badge">CRITICAL</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div style={{ 
        display: 'flex', 
        gap: '12px', 
        justifyContent: 'flex-end',
        paddingBottom: '24px'
      }}>
        <Link href={`/templates/${template.id}/edit`}>
          <button className="btn btn-secondary">
            Edit Template
          </button>
        </Link>
      </div>
    </div>
  )
}