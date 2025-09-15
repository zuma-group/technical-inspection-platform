'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getTemplate, updateTemplate, addSection, deleteSection, addCheckpoint, deleteCheckpoint, updateSection, updateCheckpoint, deleteTemplate } from '../../actions'

export default function EditTemplatePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [templateId, setTemplateId] = useState<string>('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [equipmentType, setEquipmentType] = useState('')
  const [sections, setSections] = useState<Array<{
    id: string;
    name: string;
    order: number;
    checkpoints: Array<{
      id: string;
      name: string;
      critical: boolean;
      order: number;
    }>;
  }>>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadTemplate() {
      const { id } = await params
      setTemplateId(id)
      const template = await getTemplate(id)
      if (template) {
        setName(template.name)
        setDescription(template.description || '')
        setEquipmentType(template.equipmentType)
        setSections(template.sections)
      }
      setLoading(false)
    }
    loadTemplate()
  }, [params])

  const handleAddSection = async () => {
    const result = await addSection(templateId, {
      name: 'New Section',
      order: sections.length + 1
    })
    if (result.success && result.data) {
      setSections([...sections, { ...result.data, checkpoints: [] }])
    }
  }

  const handleDeleteSection = async (sectionId: string) => {
    if (confirm('Are you sure you want to delete this section?')) {
      await deleteSection(sectionId)
      setSections(sections.filter(s => s.id !== sectionId))
    }
  }

  const handleUpdateSection = async (sectionId: string, field: string, value: string | number) => {
    await updateSection(sectionId, { [field]: value })
    setSections(sections.map(s => 
      s.id === sectionId ? { ...s, [field]: value } : s
    ))
  }

  const handleAddCheckpoint = async (sectionId: string) => {
    const section = sections.find(s => s.id === sectionId)
    if (!section) return
    
    const result = await addCheckpoint(sectionId, {
      name: 'New Checkpoint',
      critical: false,
      order: section.checkpoints.length + 1
    })
    if (result.success && result.data) {
      setSections(sections.map(s => 
        s.id === sectionId 
          ? { ...s, checkpoints: [...s.checkpoints, result.data] }
          : s
      ))
    }
  }

  const handleDeleteCheckpoint = async (sectionId: string, checkpointId: string) => {
    await deleteCheckpoint(checkpointId)
    setSections(sections.map(s => 
      s.id === sectionId 
        ? { ...s, checkpoints: s.checkpoints.filter((cp: { id: string }) => cp.id !== checkpointId) }
        : s
    ))
  }

  const handleUpdateCheckpoint = async (sectionId: string, checkpointId: string, field: string, value: string | boolean | number) => {
    await updateCheckpoint(checkpointId, { [field]: value })
    setSections(sections.map(s => 
      s.id === sectionId 
        ? {
            ...s,
            checkpoints: s.checkpoints.map((cp: any) => 
              cp.id === checkpointId ? { ...cp, [field]: value } : cp
            )
          }
        : s
    ))
  }

  const handleSave = async () => {
    await updateTemplate(templateId, {
      name,
      description,
      equipmentType
    })
    router.push('/templates')
  }

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this template? This action cannot be undone.')) {
      await deleteTemplate(templateId)
      router.push('/templates')
    }
  }

  if (loading) {
    return (
      <div className="container">
        <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
          Loading template...
        </div>
      </div>
    )
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
        <h1 className="text-3xl font-bold text-gray-900">Edit Template</h1>
        <p className="text-gray-600 mt-1">Modify inspection checkpoints</p>
      </div>

      <div className="card mb-6">
        <h2 className="text-lg font-semibold mb-4">Template Details</h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Template Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="form-input"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Equipment Type
            </label>
            <select
              value={equipmentType}
              onChange={(e) => setEquipmentType(e.target.value)}
              className="form-select"
            >
              <option value="BOOM_LIFT">Boom Lift</option>
              <option value="SCISSOR_LIFT">Scissor Lift</option>
              <option value="TELEHANDLER">Telehandler</option>
              <option value="FORKLIFT">Forklift</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="form-textarea"
            />
          </div>
        </div>
      </div>

      <div className="card mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Sections & Checkpoints</h2>
          <button onClick={handleAddSection} className="btn btn-primary">
            + Add Section
          </button>
        </div>

        {sections.map((section) => (
          <div key={section.id} className="bg-teal-50 rounded-lg p-4 mb-4 border-2 border-teal-300">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-3 mb-3">
              <input
                type="text"
                value={section.name}
                onChange={(e) => handleUpdateSection(section.id, 'name', e.target.value)}
                onBlur={(e) => handleUpdateSection(section.id, 'name', e.target.value)}
                className="px-3 py-2 border-2 border-gray-400 rounded-lg text-sm focus:outline-none focus:border-blue-500"
              />
              <button
                onClick={() => handleDeleteSection(section.id)}
                className="btn btn-danger"
              >
                Delete
              </button>
            </div>

            <div className="ml-5">
              {section.checkpoints.map((checkpoint: any) => (
                <div key={checkpoint.id} className="grid grid-cols-1 lg:grid-cols-[1fr_120px_auto] gap-2 items-center mb-2">
                  <input
                    type="text"
                    value={checkpoint.name}
                    onChange={(e) => handleUpdateCheckpoint(section.id, checkpoint.id, 'name', e.target.value)}
                    onBlur={(e) => handleUpdateCheckpoint(section.id, checkpoint.id, 'name', e.target.value)}
                    className="px-2 py-1.5 border-2 border-gray-400 rounded text-sm focus:outline-none focus:border-blue-500"
                  />
                  <label className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={checkpoint.critical}
                      onChange={(e) => handleUpdateCheckpoint(section.id, checkpoint.id, 'critical', e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Critical</span>
                  </label>
                  <button
                    onClick={() => handleDeleteCheckpoint(section.id, checkpoint.id)}
                    className="px-2 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600 transition-colors"
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button
                onClick={() => handleAddCheckpoint(section.id)}
                className="btn btn-secondary mt-2 text-sm"
              >
                + Add Checkpoint
              </button>
            </div>
          </div>
        ))}
      </div>

      <div style={{ 
        display: 'flex', 
        gap: '12px', 
        justifyContent: 'space-between',
        padding: '20px 0',
        marginTop: '20px',
        borderTop: '1px solid #E5E7EB',
        flexWrap: 'wrap'
      }}>
        <button
          onClick={handleDelete}
          className="btn btn-danger"
        >
          Delete Template
        </button>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => router.push('/templates')}
            className="btn btn-secondary"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="btn btn-primary"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}