'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { deleteTemplate } from './actions'
import { Icons } from '@/lib/icons'

export default function DeleteButton({ templateId, templateName, isDefault, onDelete }: { 
  templateId: string
  templateName: string
  isDefault: boolean
  onDelete?: () => void
}) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean
    templateName: string
  } | null>(null)
  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean
    title: string
    message: string
    type: 'error' | 'warning' | 'info'
  } | null>(null)

  const handleDelete = async () => {
    if (isDefault) {
      setAlertModal({
        isOpen: true,
        title: 'Cannot Delete',
        message: 'Cannot delete default templates',
        type: 'warning'
      })
      return
    }

    setConfirmModal({
      isOpen: true,
      templateName
    })
  }

  const executeDelete = async () => {
    setConfirmModal(null)
    setIsDeleting(true)
    try {
      await deleteTemplate(templateId)
      if (onDelete) {
        onDelete()
      } else {
        router.refresh()
      }
    } catch (error) {
      console.error('Failed to delete template:', error)
      setAlertModal({
        isOpen: true,
        title: 'Delete Failed',
        message: 'Failed to delete template',
        type: 'error'
      })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
    <button
      onClick={handleDelete}
      disabled={isDeleting || isDefault}
      className={`btn btn-danger w-full text-sm py-2 transition-all duration-200 inline-flex items-center justify-center gap-1 ${
        isDefault ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 hover:shadow-lg'
      }`}
    >
      {isDeleting ? (
        <>
          <Icons.loader className="w-3 h-3 animate-spin" />
          <span>Deleting...</span>
        </>
      ) : (
        <>
          <Icons.delete className="w-3 h-3" />
          <span>Delete</span>
        </>
      )}
    </button>

    {/* Confirm Delete Modal */}
    {confirmModal?.isOpen && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Confirm Delete</h3>
            <p className="text-sm text-gray-600">
              Are you sure you want to delete the template &quot;{confirmModal.templateName}&quot;? This action cannot be undone.
            </p>
          </div>
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => setConfirmModal(null)}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={executeDelete}
              className="btn btn-danger"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    )}

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
  </>
  )
}