import { getTemplates } from '@/app/templates/actions'
import { prisma } from '@/lib/prisma'
import SelectTemplateClient from './client'

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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Equipment Not Found</h1>
          <p className="text-gray-600">
            The equipment you&apos;re looking for doesn&apos;t exist.
          </p>
        </div>
      </div>
    )
  }
  
  // Filter templates to only show matching equipment type
  const relevantTemplates = allTemplates
    .filter(template => template.equipmentType === equipment.type)
    .sort((a, b) => {
      // Sort by default status first
      if (a.isDefault && !b.isDefault) return -1
      if (!a.isDefault && b.isDefault) return 1
      
      // Then sort by name
      return a.name.localeCompare(b.name)
    })

  // Find default template for this equipment type
  const defaultTemplate = relevantTemplates.find(t => t.isDefault)

  return (
    <SelectTemplateClient 
      equipment={equipment}
      templates={relevantTemplates}
      defaultTemplate={defaultTemplate}
      equipmentId={id}
    />
  )
}