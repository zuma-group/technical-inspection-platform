import Link from 'next/link'
import { getTemplates } from './actions'
import DeleteButton from './delete-button'
import { Icons, iconSizes } from '@/lib/icons'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function TemplatesPage() {
  const templates = await getTemplates()
  console.log('Templates loaded:', templates.length, templates.map(t => ({ id: t.id, name: t.name })))

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="mb-8">
        <div className="mb-6">
          <Link href="/">
            <button className="btn btn-secondary inline-flex items-center gap-2 hover:scale-105 transition-transform duration-200">
              <Icons.back className={iconSizes.sm} />
              <span>Back to Equipment</span>
            </button>
          </Link>
        </div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Inspection Templates</h1>
            <p className="text-gray-600 mt-1">Manage inspection checklists for different equipment types</p>
          </div>
          <Link href="/templates/new">
            <button className="btn btn-primary inline-flex items-center gap-2 hover:scale-105 hover:shadow-lg transition-all duration-200">
              <Icons.add className={iconSizes.sm} />
              <span>New Template</span>
            </button>
          </Link>
        </div>
      </div>

      {templates.length === 0 ? (
        <div className="card text-center py-10 px-5">
          <Icons.document className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 mb-5">
            No templates created yet. Create your first inspection template.
          </p>
          <Link href="/templates/new">
            <button className="btn btn-primary inline-flex items-center gap-2 hover:scale-105 transition-transform duration-200">
              <Icons.add className={iconSizes.sm} />
              <span>Create Template</span>
            </button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map(template => (
            <div key={template.id} className="card hover:shadow-xl transition-shadow duration-300 flex flex-col">
              <div className="flex-1 mb-4">
                <div className="flex justify-between items-start mb-2">
                  <h2 className="text-lg font-semibold text-gray-900">{template.name}</h2>
                  <div className="flex gap-1">
                    {template.parentTemplateId && (
                      <span className="px-2 py-1 text-xs font-medium bg-blue-50 text-blue-700 rounded-full">
                        CHILD
                      </span>
                    )}
                    {template.isDefault && (
                      <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                        DEFAULT
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-2">
                  {template.equipmentType.replace('_', ' ')}
                </p>
                {template.parentTemplateId && (
                  <p className="text-xs text-blue-600 mb-2 flex items-center gap-1">
                    <Icons.chevronRight className="w-3 h-3" />
                    Extends: {templates.find(t => t.id === template.parentTemplateId)?.name || 'Parent template'}
                  </p>
                )}
                {template.description && (
                  <p className="text-xs text-gray-500 mb-3 line-clamp-2">
                    {template.description}
                  </p>
                )}
                <div className="text-xs text-gray-600 flex items-center gap-2">
                  <span className="flex items-center gap-1">
                    <Icons.document className="w-3 h-3" />
                    {template.sections.length} sections
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Icons.checkSquare className="w-3 h-3" />
                    {template.sections.reduce((acc, section) => acc + section.checkpoints.length, 0)} checkpoints
                  </span>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-2 border-t border-gray-100 pt-4">
                <Link href={`/templates/${template.id}/edit`}>
                  <button className="btn btn-secondary w-full text-sm py-2 hover:scale-105 transition-transform duration-200 inline-flex items-center justify-center gap-1">
                    <Icons.edit className="w-3 h-3" />
                    <span>Edit</span>
                  </button>
                </Link>
                <Link href={`/templates/${template.id}/preview`}>
                  <button className="btn btn-primary w-full text-sm py-2 hover:scale-105 transition-transform duration-200 inline-flex items-center justify-center gap-1">
                    <Icons.view className="w-3 h-3" />
                    <span>View</span>
                  </button>
                </Link>
                <DeleteButton 
                  templateId={template.id} 
                  templateName={template.name}
                  isDefault={template.isDefault}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}