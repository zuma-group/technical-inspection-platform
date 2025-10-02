'use client'

import { useState } from 'react'
import Link from 'next/link'
import EmailReportButton from './email-report-button'

interface Inspection {
  id: string
  equipmentId: string
  equipment: {
    model: string
    serial: string
  }
  status: string
  startedAt: string
  sections: Array<{
    id: string
    name: string
    checkpoints: Array<{
      id: string
      name: string
      status: string | null
      notes: string | null
      estimatedHours: number | null
      media: Array<{
        id: string
        type: string
      }>
    }>
  }>
}

interface MediaGalleryProps {
  media: Array<{
    id: string
    type: string
  }>
}

function MediaGallery({ media }: MediaGalleryProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {media.map((item) => (
        <div key={item.id} className="w-16 h-16 bg-gray-200 rounded border flex items-center justify-center">
          <span className="text-xs text-gray-600">
            {item.type === 'video' ? '🎥' : '📷'}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function InspectionDetailClient({ inspection }: { inspection: Inspection }) {
  const [isDownloading, setIsDownloading] = useState(false)

  const handleDownload = async () => {
    setIsDownloading(true)
    try {
      const response = await fetch(`/api/inspections/${inspection.id}/pdf`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `inspection-${inspection.equipment.serial}-${new Date().toISOString().split('T')[0]}.pdf`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        console.error('Failed to download PDF')
      }
    } catch (error) {
      console.error('Error downloading PDF:', error)
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="mb-6 flex justify-between items-center">
        <Link href={`/equipment/${inspection.equipmentId}`}>
          <button className="btn btn-secondary">← Back to Equipment</button>
        </Link>
        <div className="flex gap-3">
          <EmailReportButton inspectionId={inspection.id} />
          <button 
            onClick={handleDownload}
            disabled={isDownloading}
            className="btn btn-primary"
          >
            {isDownloading ? 'Downloading...' : 'Download PDF'}
          </button>
        </div>
      </div>

      <div className="card mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Inspection</h1>
        <p className="text-gray-600">
          {inspection.equipment.model} • {inspection.equipment.serial}
        </p>
        <p className="text-sm text-gray-600 mt-1">
          {new Date(inspection.startedAt).toLocaleString()} • Status: {inspection.status.replace(/_/g, ' ')}
        </p>
      </div>

      {inspection.sections.map((section) => (
        <div key={section.id} className="card mb-4">
          <h2 className="text-lg font-semibold mb-3">{section.name}</h2>
          <div className="space-y-2">
            {section.checkpoints.map(cp => (
              <div key={cp.id} className="p-3 border-2 border-gray-200 rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="font-medium text-gray-900">{cp.name}</div>
                    {cp.notes && (
                      <div className="text-sm text-gray-600 mt-1">Notes: {cp.notes}</div>
                    )}
                    {cp.estimatedHours && (
                      <div className="text-sm text-gray-600 mt-1">Estimated Hours: {cp.estimatedHours}</div>
                    )}
                  </div>
                  <span className={`status-badge ${
                    cp.status === 'PASS' ? 'status-operational' :
                    cp.status === 'CORRECTED' ? 'status-maintenance' :
                    cp.status === 'ACTION_REQUIRED' ? 'status-out_of_service' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {cp.status ?? 'N/A'}
                  </span>
                </div>
                
                {/* Media display */}
                {cp.media && cp.media.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs text-gray-600 mb-2">Attached media ({cp.media.length}):</p>
                    <MediaGallery
                      media={cp.media.map(m => ({ id: m.id, type: m.type === 'video' ? 'video' : 'image' }))}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Download overlay */}
      {isDownloading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">Downloading PDF</h3>
                <p className="text-sm text-gray-600">Please wait while we generate your inspection report...</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
