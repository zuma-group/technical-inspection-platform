import Link from 'next/link'
import { getTemplates } from './actions'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function TemplatesPage() {
  const templates = await getTemplates()
  console.log('Templates loaded:', templates.length, templates.map(t => ({ id: t.id, name: t.name })))

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
            <h1 className="page-title">Inspection Templates</h1>
            <p className="page-subtitle">Manage inspection checklists for different equipment types</p>
          </div>
          <Link href="/templates/new">
            <button className="btn btn-primary">
              + New Template
            </button>
          </Link>
        </div>
      </div>

      {templates.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <p style={{ color: '#6B7280', marginBottom: '20px' }}>
            No templates created yet. Create your first inspection template.
          </p>
          <Link href="/templates/new">
            <button className="btn btn-primary">
              Create Template
            </button>
          </Link>
        </div>
      ) : (
        <div className="templates-grid">
          {templates.map(template => (
            <div key={template.id} className="card template-card">
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
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <Link href={`/templates/${template.id}/edit`}>
                  <button className="btn btn-secondary" style={{ width: '100%' }}>
                    Edit
                  </button>
                </Link>
                <Link href={`/templates/${template.id}/preview`}>
                  <button className="btn btn-primary" style={{ width: '100%' }}>
                    Preview
                  </button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}