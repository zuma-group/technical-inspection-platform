'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createEquipment } from '../actions'
import CustomSelect from '@/app/components/custom-select'
import { Icons, iconSizes } from '@/lib/icons'

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
        <h1 className="text-3xl font-bold text-gray-900">Add New Equipment</h1>
        <p className="text-gray-600 mt-2">Register new equipment for inspection</p>
      </div>

      <form onSubmit={handleSubmit} className="card">
        {/* Row 1: Model and Type */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Model Name *
            </label>
            <input
              type="text"
              value={formData.model}
              onChange={(e) => setFormData({ ...formData, model: e.target.value })}
              placeholder="e.g., Genie Z-45/25J"
              required
              className="form-input focus:scale-[1.01] transition-transform duration-200"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Equipment Type *
            </label>
            <CustomSelect
              value={formData.type}
              onChange={(value) => setFormData({ ...formData, type: value })}
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

        {/* Row 2: Serial and Location */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Serial Number *
            </label>
            <input
              type="text"
              value={formData.serial}
              onChange={(e) => setFormData({ ...formData, serial: e.target.value })}
              placeholder="e.g., SN123456789"
              required
              className="form-input focus:scale-[1.01] transition-transform duration-200"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Location *
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="e.g., Site A - North Yard"
              required
              className="form-input focus:scale-[1.01] transition-transform duration-200"
            />
          </div>
        </div>

        {/* Row 3: Hours and Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-2 gap-4 mb-6">
          <div className="md:col-span-1">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Hours Used
            </label>
            <input
              type="number"
              value={formData.hoursUsed}
              onChange={(e) => setFormData({ ...formData, hoursUsed: parseInt(e.target.value) || 0 })}
              min="0"
              className="form-input focus:scale-[1.01] transition-transform duration-200"
            />
          </div>

          <div className="md:col-span-2 lg:col-span-1">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Status
            </label>
            <CustomSelect
              value={formData.status}
              onChange={(value) => setFormData({ ...formData, status: value })}
              placeholder="Select status"
              options={[
                { value: 'OPERATIONAL', label: 'Operational' },
                { value: 'MAINTENANCE', label: 'Maintenance' },
                { value: 'OUT_OF_SERVICE', label: 'Out of Service' }
              ]}
            />
          </div>
        </div>

        <div className="flex gap-3 justify-end pt-5 border-t border-gray-200">
          <button
            type="button"
            onClick={() => router.push('/')}
            className="btn btn-secondary hover:scale-105 transition-all duration-200 inline-flex items-center gap-2"
          >
            <Icons.close className={iconSizes.sm} />
            <span>Cancel</span>
          </button>
          <button
            type="submit"
            className="btn btn-primary hover:scale-105 hover:shadow-lg transition-all duration-200 inline-flex items-center gap-2"
          >
            <Icons.add className={iconSizes.sm} />
            <span>Add Equipment</span>
          </button>
        </div>
      </form>
      
      {/* Add spacing at the bottom */}
      <div className="h-16"></div>
    </div>
  )
}