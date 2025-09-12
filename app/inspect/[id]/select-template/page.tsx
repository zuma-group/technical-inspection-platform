import Link from 'next/link'
import { getTemplates } from '@/app/templates/actions'
import { prisma } from '@/lib/prisma'
import { Icons, iconSizes } from '@/lib/icons'

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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="text-center py-12">
          <Icons.alertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Equipment Not Found</h1>
          <p className="text-gray-600 mb-6">
            The equipment you&apos;re looking for doesn&apos;t exist.
          </p>
          <Link href="/">
            <button className="btn btn-primary inline-flex items-center gap-2 hover:scale-105 transition-transform duration-200">
              <Icons.back className={iconSizes.sm} />
              <span>Back to Equipment</span>
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
        <h1 className="text-3xl font-bold text-gray-900">Select Inspection Template</h1>
        <p className="text-gray-600 mt-2">
          For {equipment.model} ({equipment.serial})
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Default Template Option */}
        <Link href={`/inspect/${id}`} className="no-underline group">
          <div className="card border-2 border-blue-500 cursor-pointer hover:shadow-xl hover:scale-105 transition-all duration-300 h-full flex flex-col">
            <div className="flex-1 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Icons.gauge className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-semibold text-gray-900">
                  Quick Inspection
                </h2>
              </div>
              <p className="text-sm text-gray-600">
                {defaultTemplate 
                  ? `Use default ${equipment.type.replace(/_/g, ' ').toLowerCase()} template`
                  : 'Use basic inspection template'
                }
              </p>
              {defaultTemplate && (
                <div className="text-xs text-gray-600 mt-3 flex items-center gap-2">
                  <span className="flex items-center gap-1">
                    <Icons.document className="w-3 h-3" />
                    {defaultTemplate.sections.length} sections
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Icons.checkSquare className="w-3 h-3" />
                    {defaultTemplate.sections.reduce((acc, section) => acc + section.checkpoints.length, 0)} checkpoints
                  </span>
                </div>
              )}
            </div>
            <button className="btn btn-primary w-full group-hover:shadow-lg transition-shadow duration-200">
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
              className="no-underline group"
            >
              <div className={`card cursor-pointer hover:shadow-xl hover:scale-105 transition-all duration-300 h-full flex flex-col ${
                isRecommended ? 'border-2 border-green-500' : ''
              }`}>
                <div className="flex-1 mb-4">
                  <div className="flex justify-between items-start mb-2">
                    <h2 className="text-lg font-semibold text-gray-900">{template.name}</h2>
                    <div className="flex gap-1 flex-wrap">
                      {isRecommended && (
                        <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                          RECOMMENDED
                        </span>
                      )}
                      {template.parentTemplateId && (
                        <span className="px-2 py-1 text-xs font-medium bg-blue-50 text-blue-700 rounded-full">
                          EXTENDED
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
                    For: {template.equipmentType.replace(/_/g, ' ')}
                  </p>
                  {template.parentTemplateId && (
                    <p className="text-xs text-blue-600 mb-2 flex items-center gap-1">
                      <Icons.chevronRight className="w-3 h-3" />
                      Extends: {allTemplates.find(t => t.id === template.parentTemplateId)?.name || 'Parent template'}
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
              <button className="btn btn-secondary w-full group-hover:shadow-lg transition-shadow duration-200">
                Use Template
              </button>
            </div>
          </Link>
          )
        })}
      </div>

      {allTemplates.length === 0 && (
        <div className="card text-center py-10 px-5 mt-5">
          <Icons.document className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 mb-5">
            No custom templates available yet.
          </p>
          <Link href="/templates/new">
            <button className="btn btn-primary inline-flex items-center gap-2 hover:scale-105 transition-transform duration-200">
              <Icons.add className={iconSizes.sm} />
              <span>Create Template</span>
            </button>
          </Link>
        </div>
      )}
      
      {allTemplates.length > 0 && (
        <div className="text-center mt-6 pb-6">
          <p className="text-sm text-gray-600 mb-3">
            Showing {allTemplates.length} template{allTemplates.length !== 1 ? 's' : ''}
            {` for inspection of ${equipment.model}`}
          </p>
          <Link href="/templates/new">
            <button className="btn btn-secondary inline-flex items-center gap-2 hover:scale-105 transition-transform duration-200">
              <Icons.add className={iconSizes.sm} />
              <span>Create New Template</span>
            </button>
          </Link>
        </div>
      )}
    </div>
  )
}