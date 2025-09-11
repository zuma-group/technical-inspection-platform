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
            <p style={{ fontSize: '13px', color: '#6B7280', marginTop: '8px' }}>
              This template will inherit all sections and checkpoints from the parent. You can add additional sections below.
            </p>
          )}
        </div>

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
      </div>

      <div className="card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600' }}>Sections & Checkpoints</h2>
          <button onClick={addSection} className="btn btn-primary" style={{ padding: '8px 16px' }}>
            + Add Section
          </button>
        </div>

        {sections.map((section, _sectionIndex) => (
          <div key={section.id} style={{ 
            background: section.inherited ? '#F0F9FF' : '#F9FAFB', 
            borderRadius: '8px', 
            padding: '16px',
            marginBottom: '16px',
            border: section.inherited ? '2px solid #BFDBFE' : 'none'
          }}>
            {section.inherited && (
              <div style={{ 
                fontSize: '12px', 
                color: '#1E40AF', 
                fontWeight: '600', 
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <span>↳</span> INHERITED FROM PARENT
              </div>
            )}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
              <input
                type="text"
                value={section.code}
                onChange={(e) => updateSection(section.id, 'code', e.target.value)}
                disabled={section.inherited}
                placeholder="Code (e.g., PB)"
                style={{
                  width: '100px',
                  padding: '8px',
                  border: '1px solid #E5E7EB',
                  borderRadius: '6px',
                  fontSize: '14px',
                  background: section.inherited ? '#F9FAFB' : 'white',
                  cursor: section.inherited ? 'not-allowed' : 'text'
                }}
              />
              <input
                type="text"
                value={section.name}
                onChange={(e) => updateSection(section.id, 'name', e.target.value)}
                disabled={section.inherited}
                placeholder="Section Name (e.g., Platform & Basket)"
                style={{
                  flex: 1,
                  padding: '8px',
                  border: '1px solid #E5E7EB',
                  borderRadius: '6px',
                  fontSize: '14px',
                  background: section.inherited ? '#F9FAFB' : 'white',
                  cursor: section.inherited ? 'not-allowed' : 'text'
                }}
              />
              {!section.inherited && sections.filter(s => !s.inherited).length > 1 && (
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
              {section.checkpoints.map((checkpoint, _cpIndex) => (
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
                    disabled={section.inherited}
                    placeholder="Code"
                    style={{
                      width: '80px',
                      padding: '6px',
                      border: '1px solid #E5E7EB',
                      borderRadius: '4px',
                      fontSize: '13px',
                      background: section.inherited ? '#F9FAFB' : 'white',
                      cursor: section.inherited ? 'not-allowed' : 'text'
                    }}
                  />
                  <input
                    type="text"
                    value={checkpoint.name}
                    onChange={(e) => updateCheckpoint(section.id, checkpoint.id, 'name', e.target.value)}
                    disabled={section.inherited}
                    placeholder="Checkpoint Name"
                    style={{
                      flex: 1,
                      padding: '6px',
                      border: '1px solid #E5E7EB',
                      borderRadius: '4px',
                      fontSize: '13px',
                      background: section.inherited ? '#F9FAFB' : 'white',
                      cursor: section.inherited ? 'not-allowed' : 'text'
                    }}
                  />
                  <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <input
                      type="checkbox"
                      checked={checkpoint.critical}
                      onChange={(e) => updateCheckpoint(section.id, checkpoint.id, 'critical', e.target.checked)}
                      disabled={section.inherited}
                    />
                    <span style={{ fontSize: '13px' }}>Critical</span>
                  </label>
                  {!section.inherited && (
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
                  )}
                </div>
              ))}
              {!section.inherited && (
                <button
                  onClick={() => addCheckpoint(section.id)}
                  className="btn btn-secondary"
                  style={{ padding: '6px 12px', fontSize: '13px', marginTop: '8px' }}
                >
                  + Add Checkpoint
                </button>
              )}
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