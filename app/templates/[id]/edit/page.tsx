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
    code: string;
    order: number;
    checkpoints: Array<{
      id: string;
      code: string;
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
      code: 'NS',
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
      code: `${section.code}-${(section.checkpoints.length + 1).toString().padStart(2, '0')}`,
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
    <div className="container template-editor">
      <div className="page-header">
        <div style={{ marginBottom: '24px' }}>
          <Link href="/templates">
            <button className="btn btn-secondary" style={{ padding: '8px 16px' }}>
              ← Back to Templates
            </button>
          </Link>
        </div>
        <h1 className="page-title">Edit Template</h1>
        <p className="page-subtitle">Modify inspection checkpoints</p>
      </div>

      <div className="card" style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>Template Details</h2>
        
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
            Template Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #E5E7EB',
              borderRadius: '8px',
              fontSize: '16px'
            }}
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #E5E7EB',
              borderRadius: '8px',
              fontSize: '16px',
              resize: 'vertical'
            }}
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
            Equipment Type
          </label>
          <select
            value={equipmentType}
            onChange={(e) => setEquipmentType(e.target.value)}
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #E5E7EB',
              borderRadius: '8px',
              fontSize: '16px',
              background: 'white'
            }}
          >
            <option value="BOOM_LIFT">Boom Lift</option>
            <option value="SCISSOR_LIFT">Scissor Lift</option>
            <option value="TELEHANDLER">Telehandler</option>
            <option value="FORKLIFT">Forklift</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600' }}>Sections & Checkpoints</h2>
          <button onClick={handleAddSection} className="btn btn-primary" style={{ padding: '8px 16px' }}>
            + Add Section
          </button>
        </div>

        {sections.map((section) => (
          <div key={section.id} style={{ 
            background: '#F9FAFB', 
            borderRadius: '8px', 
            padding: '16px',
            marginBottom: '16px'
          }}>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
              <input
                type="text"
                value={section.code}
                onChange={(e) => handleUpdateSection(section.id, 'code', e.target.value)}
                onBlur={(e) => handleUpdateSection(section.id, 'code', e.target.value)}
                style={{
                  width: '100px',
                  padding: '8px',
                  border: '1px solid #E5E7EB',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
              <input
                type="text"
                value={section.name}
                onChange={(e) => handleUpdateSection(section.id, 'name', e.target.value)}
                onBlur={(e) => handleUpdateSection(section.id, 'name', e.target.value)}
                style={{
                  flex: 1,
                  padding: '8px',
                  border: '1px solid #E5E7EB',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
              <button
                onClick={() => handleDeleteSection(section.id)}
                className="btn btn-danger"
                style={{ padding: '8px 12px' }}
              >
                Delete
              </button>
            </div>

            <div style={{ marginLeft: '20px' }}>
              {section.checkpoints.map((checkpoint: any) => (
                <div key={checkpoint.id} style={{ 
                  display: 'flex', 
                  gap: '8px', 
                  alignItems: 'center',
                  marginBottom: '8px' 
                }}>
                  <input
                    type="text"
                    value={checkpoint.code}
                    onChange={(e) => handleUpdateCheckpoint(section.id, checkpoint.id, 'code', e.target.value)}
                    onBlur={(e) => handleUpdateCheckpoint(section.id, checkpoint.id, 'code', e.target.value)}
                    style={{
                      width: '80px',
                      padding: '6px',
                      border: '1px solid #E5E7EB',
                      borderRadius: '4px',
                      fontSize: '13px'
                    }}
                  />
                  <input
                    type="text"
                    value={checkpoint.name}
                    onChange={(e) => handleUpdateCheckpoint(section.id, checkpoint.id, 'name', e.target.value)}
                    onBlur={(e) => handleUpdateCheckpoint(section.id, checkpoint.id, 'name', e.target.value)}
                    style={{
                      flex: 1,
                      padding: '6px',
                      border: '1px solid #E5E7EB',
                      borderRadius: '4px',
                      fontSize: '13px'
                    }}
                  />
                  <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <input
                      type="checkbox"
                      checked={checkpoint.critical}
                      onChange={(e) => handleUpdateCheckpoint(section.id, checkpoint.id, 'critical', e.target.checked)}
                    />
                    <span style={{ fontSize: '13px' }}>Critical</span>
                  </label>
                  <button
                    onClick={() => handleDeleteCheckpoint(section.id, checkpoint.id)}
                    style={{
                      padding: '4px 8px',
                      background: '#EF4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button
                onClick={() => handleAddCheckpoint(section.id)}
                className="btn btn-secondary"
                style={{ padding: '6px 12px', fontSize: '13px', marginTop: '8px' }}
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