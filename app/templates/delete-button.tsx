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
        if (onDelete) {
          onDelete()
        } else {
          router.refresh()
        }
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
  )
}