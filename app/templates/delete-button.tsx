'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { deleteTemplate } from './actions'

export default function DeleteButton({ templateId, templateName, isDefault }: { 
  templateId: string
  templateName: string
  isDefault: boolean
}) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    if (isDefault) {
      alert('Cannot delete default templates')
      return
    }

    const confirmed = confirm(`Are you sure you want to delete the template "${templateName}"? This action cannot be undone.`)
    
    if (confirmed) {
      setIsDeleting(true)
      try {
        await deleteTemplate(templateId)
        router.refresh()
      } catch (error) {
        console.error('Failed to delete template:', error)
        alert('Failed to delete template')
      } finally {
        setIsDeleting(false)
      }
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isDeleting || isDefault}
      className="btn btn-danger"
      style={{ 
        width: '100%',
        opacity: isDefault ? 0.5 : 1,
        cursor: isDefault ? 'not-allowed' : 'pointer'
      }}
    >
      {isDeleting ? 'Deleting...' : 'Delete'}
    </button>
  )
}