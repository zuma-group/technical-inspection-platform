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
    taskId: ''
  })
  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean
    title: string
    message: string
    type: 'error' | 'warning' | 'info'
  } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.model || !formData.serial || !formData.location) {
      setAlertModal({
        isOpen: true,
        title: 'Missing Required Fields',
        message: 'Please fill in all required fields',
        type: 'error'
      })
      return
    }

    try {
      const result = await createEquipment(formData)
      if (result?.success) {
        router.push('/')
        router.refresh()
      } else {
        setAlertModal({
          isOpen: true,
          title: 'Creation Failed',
          message: result?.error || 'Failed to create equipment',
          type: 'error'
        })
      }
    } catch (error) {
      console.error('Failed to create equipment:', error)
      setAlertModal({
        isOpen: true,
        title: 'Creation Failed',
        message: 'Failed to create equipment',
        type: 'error'
      })
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

        {/* Row 3: Hours and Task ID */}
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
              Task ID (Stock No.)
            </label>
            <input
              type="text"
              value={formData.taskId}
              onChange={(e) => setFormData({ ...formData, taskId: e.target.value })}
              placeholder="Enter external task ID"
              className="form-input focus:scale-[1.01] transition-transform duration-200"
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

      {/* Alert Modal */}
      {alertModal?.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                alertModal.type === 'error' ? 'bg-red-100' :
                alertModal.type === 'warning' ? 'bg-yellow-100' :
                'bg-blue-100'
              }`}>
                {alertModal.type === 'error' ? (
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : alertModal.type === 'warning' ? (
                  <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </div>
              <div>
                <h3 className={`text-lg font-semibold ${
                  alertModal.type === 'error' ? 'text-red-900' :
                  alertModal.type === 'warning' ? 'text-yellow-900' :
                  'text-blue-900'
                }`}>
                  {alertModal.title}
                </h3>
                <p className={`text-sm ${
                  alertModal.type === 'error' ? 'text-red-600' :
                  alertModal.type === 'warning' ? 'text-yellow-600' :
                  'text-blue-600'
                }`}>
                  {alertModal.message}
                </p>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setAlertModal(null)}
                className={`btn ${
                  alertModal.type === 'error' ? 'btn-danger' :
                  alertModal.type === 'warning' ? 'btn-warning' :
                  'btn-primary'
                }`}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}