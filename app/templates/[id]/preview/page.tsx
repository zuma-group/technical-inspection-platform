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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="mb-8">
        <div className="mb-6">
          <Link href="/templates">
            <button className="btn btn-secondary">
              ← Back to Templates
            </button>
          </Link>
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{template.name}</h1>
          {template.description && (
            <p className="text-gray-600 mt-2">{template.description}</p>
          )}
          <div className="flex flex-wrap gap-6 mt-4 text-sm text-gray-600">
            <span>Equipment Type: <strong className="text-gray-900">{template.equipmentType.replace('_', ' ')}</strong></span>
            <span>Sections: <strong className="text-gray-900">{template.sections.length}</strong></span>
            <span>Total Checkpoints: <strong className="text-gray-900">{totalCheckpoints}</strong></span>
            <span>Critical: <strong className="text-red-600">{criticalCheckpoints}</strong></span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {template.sections.map((section, _sectionIndex) => (
          <div key={section.id} className="card">
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px',
              marginBottom: '16px',
              paddingBottom: '12px',
              borderBottom: '2px solid #E5E7EB'
            }}>
              <h2 style={{ fontSize: '18px', fontWeight: '600', flex: 1 }}>
                {section.name}
              </h2>
              <span style={{ fontSize: '14px', color: '#6B7280' }}>
                {section.checkpoints.length} checkpoints
              </span>
            </div>

            <div style={{ display: 'grid', gap: '8px' }}>
              {section.checkpoints.map((checkpoint, _cpIndex) => (
                <div 
                  key={checkpoint.id}
                  className={`flex items-center gap-3 p-2 px-3 rounded border-2 ${checkpoint.critical ? 'bg-red-50 border-red-400' : 'bg-teal-50 border-teal-300'}`}
                >
                  <span className="flex-1 text-sm">
                    {checkpoint.name}
                  </span>
                  {checkpoint.critical && (
                    <span className="px-2 py-1 text-xs font-semibold bg-red-500 text-white rounded">CRITICAL</span>
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