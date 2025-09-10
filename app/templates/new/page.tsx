'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createTemplate } from '../actions'

export default function NewTemplatePage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [equipmentType, setEquipmentType] = useState('BOOM_LIFT')
  const [sections, setSections] = useState([
    {
      id: 'temp-1',
      name: '',
      code: '',
      order: 1,
      checkpoints: []
    }
  ])

  const addSection = () => {
    setSections([...sections, {
      id: `temp-${Date.now()}`,
      name: '',
      code: '',
      order: sections.length + 1,
      checkpoints: []
    }])
  }

  const removeSection = (id: string) => {
    setSections(sections.filter(s => s.id !== id))
  }

  const updateSection = (id: string, field: string, value: string) => {
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

  const updateCheckpoint = (sectionId: string, checkpointId: string, field: string, value: any) => {
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
    if (!name || sections.some(s => !s.name || !s.code)) {
      alert('Please fill in all required fields')
      return
    }

    try {
      const result = await createTemplate({
        name,
        description,
        equipmentType,
        sections: sections.map((s, idx) => ({
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
    <div className="container template-editor">
      <div className="page-header">
        <div style={{ marginBottom: '24px' }}>
          <Link href="/templates">
            <button className="btn btn-secondary" style={{ padding: '8px 16px' }}>
              ← Back to Templates
            </button>
          </Link>
        </div>
        <h1 className="page-title">Create New Template</h1>
        <p className="page-subtitle">Define inspection checkpoints for equipment</p>
      </div>

      <div className="card" style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>Template Details</h2>
        
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
            Template Name *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Standard Boom Lift Inspection"
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
            placeholder="Brief description of this template"
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
            Equipment Type *
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
          <button onClick={addSection} className="btn btn-primary" style={{ padding: '8px 16px' }}>
            + Add Section
          </button>
        </div>

        {sections.map((section, sectionIndex) => (
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
                onChange={(e) => updateSection(section.id, 'code', e.target.value)}
                placeholder="Code (e.g., PB)"
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
                onChange={(e) => updateSection(section.id, 'name', e.target.value)}
                placeholder="Section Name (e.g., Platform & Basket)"
                style={{
                  flex: 1,
                  padding: '8px',
                  border: '1px solid #E5E7EB',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
              {sections.length > 1 && (
                <button
                  onClick={() => removeSection(section.id)}
                  className="btn btn-danger"
                  style={{ padding: '8px 12px' }}
                >
                  Remove
                </button>
              )}
            </div>

            <div style={{ marginLeft: '20px' }}>
              {section.checkpoints.map((checkpoint, cpIndex) => (
                <div key={checkpoint.id} style={{ 
                  display: 'flex', 
                  gap: '8px', 
                  alignItems: 'center',
                  marginBottom: '8px' 
                }}>
                  <input
                    type="text"
                    value={checkpoint.code}
                    onChange={(e) => updateCheckpoint(section.id, checkpoint.id, 'code', e.target.value)}
                    placeholder="Code"
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
                    onChange={(e) => updateCheckpoint(section.id, checkpoint.id, 'name', e.target.value)}
                    placeholder="Checkpoint Name"
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
                      onChange={(e) => updateCheckpoint(section.id, checkpoint.id, 'critical', e.target.checked)}
                    />
                    <span style={{ fontSize: '13px' }}>Critical</span>
                  </label>
                  <button
                    onClick={() => removeCheckpoint(section.id, checkpoint.id)}
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
                onClick={() => addCheckpoint(section.id)}
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
        justifyContent: 'flex-end',
        padding: '20px 0',
        marginTop: '20px',
        borderTop: '1px solid #E5E7EB'
      }}>
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