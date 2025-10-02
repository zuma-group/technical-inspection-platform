'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getTemplates } from './actions'
import DeleteButton from './delete-button'
import { Icons, iconSizes } from '@/lib/icons'

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [importSuccessModal, setImportSuccessModal] = useState<{
    isOpen: boolean
    templateName?: string
  } | null>(null)

  useEffect(() => {
    loadTemplates()
  }, [])

  const loadTemplates = async () => {
    try {
      const data = await getTemplates()
      setTemplates(data)
      console.log('Templates loaded:', data.length, data.map(t => ({ id: t.id, name: t.name })))
    } catch (error) {
      console.error('Failed to load templates:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = (templateId: string) => {
    setTemplates(templates.filter(t => t.id !== templateId))
  }

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      const res = await fetch('/api/templates/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: text
      })
      if (res.ok) {
        await loadTemplates() // Reload templates
        setImportSuccessModal({ isOpen: true })
      } else {
        const error = await res.json()
        alert(`Import failed: ${error.error}`)
      }
    } catch (error) {
      console.error('Import error:', error)
      alert('Failed to import template. Please check the file format.')
    } finally {
      // Reset file input
      event.target.value = ''
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading templates...</p>
        </div>
      </div>
    )
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
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Inspection Templates</h1>
            <p className="text-gray-600 mt-1">Manage inspection checklists for different equipment types</p>
          </div>
          <div className="flex gap-2">
            <label className="btn btn-secondary relative overflow-hidden inline-flex items-center gap-2">
              <Icons.download className={iconSizes.sm} />
              <span>Import</span>
              <input
                type="file"
                accept="application/json,.json"
                className="absolute inset-0 opacity-0 cursor-pointer"
                onChange={handleImport}
              />
            </label>
            <Link href="/templates/new">
              <button className="btn btn-primary inline-flex items-center gap-2 hover:scale-105 hover:shadow-lg transition-all duration-200">
                <Icons.add className={iconSizes.sm} />
                <span>New Template</span>
              </button>
            </Link>
          </div>
        </div>
      </div>

      {templates.length === 0 ? (
        <div className="card text-center py-10 px-5">
          <Icons.document className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 mb-5">
            No templates created yet. Create your first inspection template.
          </p>
          <Link href="/templates/new">
            <button className="btn btn-primary inline-flex items-center gap-2 hover:scale-105 transition-transform duration-200">
              <Icons.add className={iconSizes.sm} />
              <span>Create Template</span>
            </button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map(template => (
            <div key={template.id} className="card hover:shadow-xl transition-shadow duration-300 flex flex-col">
              <div className="flex-1 mb-4">
                <div className="flex justify-between items-start mb-2">
                  <h2 className="text-lg font-semibold text-gray-900">{template.name}</h2>
                  <div className="flex gap-1">
                    {template.parentTemplateId && (
                      <span className="px-2 py-1 text-xs font-medium bg-blue-50 text-blue-700 rounded-full">
                        CHILD
                      </span>
                    )}
                    {template.isDefault && (
                      <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                        DEFAULT
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-2">
                  {template.equipmentType.replace('_', ' ')}
                </p>
                {template.parentTemplateId && (
                  <p className="text-xs text-blue-600 mb-2 flex items-center gap-1">
                    <Icons.chevronRight className="w-3 h-3" />
                    Extends: {templates.find(t => t.id === template.parentTemplateId)?.name || 'Parent template'}
                  </p>
                )}
                {template.description && (
                  <p className="text-xs text-gray-500 mb-3 line-clamp-2">
                    {template.description}
                  </p>
                )}
                <div className="text-xs text-gray-600 flex items-center gap-2">
                  <span className="flex items-center gap-1">
                    <Icons.document className="w-3 h-3" />
                    {template.sections.length} sections
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Icons.checkSquare className="w-3 h-3" />
                    {template.sections.reduce((acc, section) => acc + section.checkpoints.length, 0)} checkpoints
                  </span>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-2 border-t border-gray-100 pt-4">
                <Link href={`/templates/${template.id}/edit`}>
                  <button className="btn btn-secondary w-full text-sm py-2 hover:scale-105 transition-transform duration-200 inline-flex items-center justify-center gap-1">
                    <Icons.edit className="w-3 h-3" />
                    <span>Edit</span>
                  </button>
                </Link>
                <Link href={`/templates/${template.id}/preview`}>
                  <button className="btn btn-primary w-full text-sm py-2 hover:scale-105 transition-transform duration-200 inline-flex items-center justify-center gap-1">
                    <Icons.view className="w-3 h-3" />
                    <span>View</span>
                  </button>
                </Link>
                <a href={`/api/templates/${template.id}/export`}>
                  <button className="btn bg-yellow-300 w-full text-sm py-2 hover:scale-105 transition-transform duration-200 inline-flex items-center justify-center gap-1">
                    <Icons.upload className="w-3 h-3" />
                    <span>Export</span>
                  </button>
                </a>
                <DeleteButton 
                  templateId={template.id} 
                  templateName={template.name}
                  isDefault={template.isDefault}
                  onDelete={() => handleDelete(template.id)}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Import Success Modal */}
      {importSuccessModal?.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <Icons.check className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Import Successful</h3>
                <p className="text-sm text-gray-600">Template imported successfully!</p>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setImportSuccessModal(null)}
                className="btn btn-primary"
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