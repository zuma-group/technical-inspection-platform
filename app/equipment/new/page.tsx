'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createEquipment } from '../actions'

export default function NewEquipmentPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    model: '',
    type: 'BOOM_LIFT',
    serial: '',
    location: '',
    hoursUsed: 0,
    status: 'OPERATIONAL'
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.model || !formData.serial || !formData.location) {
      alert('Please fill in all required fields')
      return
    }

    try {
      await createEquipment(formData)
      router.push('/')
      router.refresh()
    } catch (error) {
      console.error('Failed to create equipment:', error)
      alert('Failed to create equipment')
    }
  }

  return (
    <div className="container">
      <div className="page-header">
        <div style={{ marginBottom: '24px' }}>
          <Link href="/">
            <button className="btn btn-secondary" style={{ padding: '8px 16px' }}>
              ← Back to Equipment
            </button>
          </Link>
        </div>
        <h1 className="page-title">Add New Equipment</h1>
        <p className="page-subtitle">Register new equipment for inspection</p>
      </div>

      <form onSubmit={handleSubmit} className="card" style={{ maxWidth: '600px', margin: '0 auto' }}>
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
            Model Name *
          </label>
          <input
            type="text"
            value={formData.model}
            onChange={(e) => setFormData({ ...formData, model: e.target.value })}
            placeholder="e.g., Genie Z-45/25J"
            required
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #E5E7EB',
              borderRadius: '8px',
              fontSize: '16px'
            }}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
            Equipment Type *
          </label>
          <select
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
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

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
            Serial Number *
          </label>
          <input
            type="text"
            value={formData.serial}
            onChange={(e) => setFormData({ ...formData, serial: e.target.value })}
            placeholder="e.g., SN123456789"
            required
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #E5E7EB',
              borderRadius: '8px',
              fontSize: '16px'
            }}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
            Location *
          </label>
          <input
            type="text"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            placeholder="e.g., Site A - North Yard"
            required
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #E5E7EB',
              borderRadius: '8px',
              fontSize: '16px'
            }}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
            Hours Used
          </label>
          <input
            type="number"
            value={formData.hoursUsed}
            onChange={(e) => setFormData({ ...formData, hoursUsed: parseInt(e.target.value) || 0 })}
            min="0"
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #E5E7EB',
              borderRadius: '8px',
              fontSize: '16px'
            }}
          />
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
            Status
          </label>
          <select
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #E5E7EB',
              borderRadius: '8px',
              fontSize: '16px',
              background: 'white'
            }}
          >
            <option value="OPERATIONAL">Operational</option>
            <option value="MAINTENANCE">Maintenance</option>
            <option value="OUT_OF_SERVICE">Out of Service</option>
          </select>
        </div>

        <div style={{ 
          display: 'flex', 
          gap: '12px', 
          justifyContent: 'flex-end',
          paddingTop: '20px',
          borderTop: '1px solid #E5E7EB'
        }}>
          <button
            type="button"
            onClick={() => router.push('/')}
            className="btn btn-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
          >
            Add Equipment
          </button>
        </div>
      </form>
    </div>
  )
}