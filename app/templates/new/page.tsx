'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createTemplate, getTemplates } from '../actions'
import CustomSelect from '@/app/components/custom-select'

export default function NewTemplatePage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [equipmentType, setEquipmentType] = useState('BOOM_LIFT')
  const [parentTemplateId, setParentTemplateId] = useState('')
  const [availableTemplates, setAvailableTemplates] = useState<Array<{
    id: string;
    name: string;
    equipmentType: string;
    sections: Array<{
      id: string;
      name: string;
      code: string;
      order: number;
      checkpoints: Array<{
        id: string;
        code: string;
        name: string;
        critical: boolean;
        order: number;
      }>;
    }>;
  }>>([])
  const [sections, setSections] = useState([
    {
      id: 'temp-1',
      name: '',
      code: '',
      order: 1,
      checkpoints: [],
      inherited: false
    }
  ])

  useEffect(() => {
    async function loadTemplates() {
      const templates = await getTemplates()
      setAvailableTemplates(templates)
    }
    loadTemplates()
  }, [])

  useEffect(() => {
    if (parentTemplateId) {
      const parentTemplate = availableTemplates.find(t => t.id === parentTemplateId)
      if (parentTemplate) {
        // Set equipment type to match parent
        setEquipmentType(parentTemplate.equipmentType)
        
        // Copy parent sections as inherited
        const inheritedSections = parentTemplate.sections.map((section) => ({
          ...section,
          id: `inherited-${section.id}`,
          inherited: true,
          checkpoints: section.checkpoints.map((cp) => ({
            ...cp,
            id: `inherited-${cp.id}`,
            inherited: true
          }))
        }))
        
        // Keep any additional sections that were added
        const additionalSections = sections.filter(s => !s.inherited)
        setSections([...inheritedSections, ...additionalSections])
      }
    } else {
      // Remove inherited sections if no parent is selected
      setSections(sections.filter(s => !s.inherited))
      if (sections.filter(s => !s.inherited).length === 0) {
        setSections([{
          id: 'temp-1',
          name: '',
          code: '',
          order: 1,
          checkpoints: [],
          inherited: false
        }])
      }
    }
  }, [parentTemplateId, availableTemplates])

  const addSection = () => {
    setSections([...sections, {
      id: `temp-${Date.now()}`,
      name: '',
      code: '',
      order: sections.length + 1,
      checkpoints: [],
      inherited: false
    }])
  }

  const removeSection = (id: string) => {
    const section = sections.find(s => s.id === id)
    if (section?.inherited) {
      alert('Cannot remove inherited sections. Choose a different parent template if needed.')
      return
    }
    setSections(sections.filter(s => s.id !== id))
  }

  const updateSection = (id: string, field: string, value: string | number) => {
    setSections(sections.map(s => 
      s.id === id ? { ...s, [field]: value } : s
    ))
  }

  const addCheckpoint = (sectionId: string) => {
    setSections(sections.map(s => 
      s.id === sectionId 
        ? {
            ...s,
            checkpoints: [...s.checkpoints, {
              id: `cp-${Date.now()}`,
              code: '',
              name: '',
              critical: false,
              order: s.checkpoints.length + 1
            }]
          }
        : s
    ))
  }

  const removeCheckpoint = (sectionId: string, checkpointId: string) => {
    setSections(sections.map(s => 
      s.id === sectionId 
        ? {
            ...s,
            checkpoints: s.checkpoints.filter(cp => cp.id !== checkpointId)
          }
        : s
    ))
  }

  const updateCheckpoint = (sectionId: string, checkpointId: string, field: string, value: string | boolean | number) => {
    setSections(sections.map(s => 
      s.id === sectionId 
        ? {
            ...s,
            checkpoints: s.checkpoints.map(cp => 
              cp.id === checkpointId ? { ...cp, [field]: value } : cp
            )
          }
        : s
    ))
  }

  const handleSubmit = async () => {
    if (!name) {
      alert('Please enter a template name')
      return
    }
    
    // For templates without a parent, we need at least one section
    if (!parentTemplateId && sections.length === 0) {
      alert('Please add at least one section')
      return
    }
    
    // Validate that all sections have required fields
    // Inherited sections should already have valid data from parent
    const invalidSections = sections.filter(s => !s.name || !s.code)
    if (invalidSections.length > 0) {
      alert('Please fill in all required fields for sections')
      return
    }

    try {
      // When creating a child template, include ALL sections (inherited + new)
      // This way the child has a complete copy of parent sections plus its own
      const sectionsToCreate = sections.map((s, idx) => ({
        name: s.name,
        code: s.code,
        order: idx + 1,
        checkpoints: s.checkpoints.map((cp, cpIdx) => ({
          code: cp.code,
          name: cp.name,
          critical: cp.critical,
          order: cpIdx + 1
        }))
      }))
      
      const result = await createTemplate({
        name,
        description,
        equipmentType,
        parentTemplateId: parentTemplateId || undefined,
        sections: sectionsToCreate
      })
      console.log('Template created:', result)
      // Add a small delay to ensure revalidation completes
      setTimeout(() => {
        router.push('/templates')
        router.refresh()
      }, 100)
    } catch (error) {
      console.error('Failed to create template:', error)
      alert('Failed to create template')
    }
  }

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
        <h1 className="text-3xl font-bold text-gray-900">Create New Template</h1>
        <p className="text-gray-600 mt-1">Define inspection checkpoints for equipment</p>
      </div>

      <div className="card mb-6">
        <h2 className="text-lg font-semibold mb-4">Template Details</h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Template Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Standard Boom Lift Inspection"
              className="form-input"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Equipment Type *
            </label>
            <CustomSelect
              value={equipmentType}
              onChange={setEquipmentType}
              disabled={!!parentTemplateId}
              placeholder="Select equipment type"
              options={[
                { value: 'BOOM_LIFT', label: 'Boom Lift' },
                { value: 'SCISSOR_LIFT', label: 'Scissor Lift' },
                { value: 'TELEHANDLER', label: 'Telehandler' },
                { value: 'FORKLIFT', label: 'Forklift' },
                { value: 'OTHER', label: 'Other' }
              ]}
            />
          </div>

          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Parent Template (Optional)
            </label>
            <CustomSelect
              value={parentTemplateId}
              onChange={setParentTemplateId}
              placeholder="None - Create from scratch"
              options={[
                { value: '', label: 'None - Create from scratch' },
                ...availableTemplates.map(template => ({
                  value: template.id,
                  label: `${template.name} (${template.equipmentType.replace('_', ' ')})`
                }))
              ]}
            />
            {parentTemplateId && (
              <p className="text-xs text-gray-500 mt-2">
                This template will inherit all sections and checkpoints from the parent. You can add additional sections below.
              </p>
            )}
          </div>

          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this template"
              rows={2}
              className="form-textarea"
            />
          </div>
        </div>
      </div>

      <div className="card mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Sections & Checkpoints</h2>
          <button onClick={addSection} className="btn btn-primary">
            + Add Section
          </button>
        </div>

        {sections.map((section, _sectionIndex) => (
          <div key={section.id} className={`rounded-lg p-4 mb-4 border-2 ${
            section.inherited ? 'bg-blue-50 border-blue-300' : 'bg-teal-50 border-teal-300'
          }`}>
            {section.inherited && (
              <div className="text-xs text-blue-700 font-semibold mb-2 flex items-center gap-1">
                <span>↳</span> INHERITED FROM PARENT
              </div>
            )}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-3 mb-3">
              <input
                type="text"
                value={section.name}
                onChange={(e) => updateSection(section.id, 'name', e.target.value)}
                disabled={section.inherited}
                placeholder="Section Name (e.g., Platform & Basket)"
                className={`px-3 py-2 border-2 border-gray-400 rounded-lg text-sm focus:outline-none focus:border-blue-500 ${
                  section.inherited ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'
                }`}
              />
              {!section.inherited && sections.filter(s => !s.inherited).length > 1 && (
                <button
                  onClick={() => removeSection(section.id)}
                  className="btn btn-danger"
                >
                  Remove
                </button>
              )}
            </div>

            <div className="ml-5">
              {section.checkpoints.map((checkpoint, _cpIndex) => (
                <div key={checkpoint.id} className="grid grid-cols-1 lg:grid-cols-[1fr_120px_auto] gap-2 items-center mb-2">
                  <input
                    type="text"
                    value={checkpoint.name}
                    onChange={(e) => updateCheckpoint(section.id, checkpoint.id, 'name', e.target.value)}
                    disabled={section.inherited}
                    placeholder="Checkpoint Name"
                    className={`px-2 py-1.5 border-2 border-gray-400 rounded text-sm focus:outline-none focus:border-blue-500 ${
                      section.inherited ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'
                    }`}
                  />
                  <label className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={checkpoint.critical}
                      onChange={(e) => updateCheckpoint(section.id, checkpoint.id, 'critical', e.target.checked)}
                      disabled={section.inherited}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Critical</span>
                  </label>
                  {!section.inherited && (
                    <button
                      onClick={() => removeCheckpoint(section.id, checkpoint.id)}
                      className="px-2 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600 transition-colors"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
              {!section.inherited && (
                <button
                  onClick={() => addCheckpoint(section.id)}
                  className="btn btn-secondary mt-2 text-sm"
                >
                  + Add Checkpoint
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-3 justify-end py-6 mt-6 border-t border-gray-200">
        <button
          onClick={() => router.push('/templates')}
          className="btn btn-secondary"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          className="btn btn-primary"
        >
          Create Template
        </button>
      </div>
    </div>
  )
}