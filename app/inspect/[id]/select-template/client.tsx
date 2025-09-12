'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Icons, iconSizes } from '@/lib/icons'

export default function SelectTemplateClient({ 
  equipment, 
  templates,
  defaultTemplate,
  equipmentId
}: { 
  equipment: any
  templates: any[]
  defaultTemplate: any
  equipmentId: string
}) {
  const router = useRouter()
  const [taskId, setTaskId] = useState('')
  const [serialNumber, setSerialNumber] = useState('')
  const [selectedTemplateId, setSelectedTemplateId] = useState('')

  const handleStartInspection = (templateId?: string) => {
    // Build URL with query params
    const params = new URLSearchParams()
    params.append('create', 'true')  // Explicitly indicate we want to create an inspection
    if (templateId) params.append('template', templateId)
    if (taskId) params.append('taskId', taskId)
    if (serialNumber) params.append('serialNumber', serialNumber)
    
    const queryString = params.toString()
    const url = `/inspect/${equipmentId}?${queryString}`
    
    router.push(url)
  }

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

      {/* Task ID and Serial Number Input Fields */}
      <div className="card mb-6">
        <h2 className="text-lg font-semibold mb-4">Inspection Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Task ID (Optional)
            </label>
            <input
              type="text"
              value={taskId}
              onChange={(e) => setTaskId(e.target.value)}
              placeholder="Enter task ID"
              className="form-input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Serial Number (Optional)
            </label>
            <input
              type="text"
              value={serialNumber}
              onChange={(e) => setSerialNumber(e.target.value)}
              placeholder="Enter serial number"
              className="form-input"
            />
          </div>
        </div>
      </div>

      {templates.length === 0 ? (
        <div className="text-center py-12 card">
          <Icons.alertCircle className="w-16 h-16 text-amber-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No Templates Available</h2>
          <p className="text-gray-600 mb-6">
            No inspection templates found for {equipment.type.replace(/_/g, ' ').toLowerCase()} equipment.
          </p>
          <Link href="/templates/new">
            <button className="btn btn-primary inline-flex items-center gap-2">
              <Icons.add className={iconSizes.sm} />
              <span>Create Template</span>
            </button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Default Template Option */}
          <div 
            onClick={() => handleStartInspection()}
            className="card border-3 border-blue-500 cursor-pointer hover:shadow-xl hover:scale-105 transition-all duration-300 h-full flex flex-col"
          >
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
                  : `Use standard inspection checklist`}
              </p>
            </div>
            <div className="mt-auto">
              <button className="btn btn-primary w-full">
                Start Quick Inspection
              </button>
            </div>
          </div>

          {/* Template Options */}
          {templates.map(template => (
            <div 
              key={template.id}
              onClick={() => handleStartInspection(template.id)}
              className="card cursor-pointer hover:shadow-xl hover:scale-105 transition-all duration-300 h-full flex flex-col"
            >
              <div className="flex-1">
                <div className="flex items-start justify-between mb-2">
                  <h2 className="text-lg font-semibold text-gray-900">
                    {template.name}
                  </h2>
                  {template.isDefault && (
                    <span className="px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-700 rounded-full">
                      DEFAULT
                    </span>
                  )}
                </div>
                {template.description && (
                  <p className="text-sm text-gray-600 mb-3">
                    {template.description}
                  </p>
                )}
                <div className="text-xs text-gray-500 space-y-1">
                  <div>• {template.sections.length} sections</div>
                  <div>• {template.sections.reduce((acc, s) => acc + s.checkpoints.length, 0)} checkpoints</div>
                </div>
              </div>
              <div className="mt-4">
                <button className="btn btn-secondary w-full">
                  Use This Template
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}