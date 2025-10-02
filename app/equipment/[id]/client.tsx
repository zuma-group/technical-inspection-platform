'use client'

import { useState } from 'react'
import Link from 'next/link'

interface Inspection {
  id: string
  status: string
  startedAt: string
  technician?: {
    name: string
    email: string
  }
  sections: Array<{
    checkpoints: Array<{
      critical: boolean
      status: string | null
    }>
  }>
}

interface Equipment {
  id: string
  model: string
  type: string
  serial: string
  location: string
  hoursUsed: number
  inspections: Inspection[]
}

interface EquipmentDetailClientProps {
  equipment: Equipment
  templateNameById: Record<string, string>
  defaultTemplateName?: string
}

export default function EquipmentDetailClient({ 
  equipment, 
  templateNameById, 
  defaultTemplateName 
}: EquipmentDetailClientProps) {
  const [downloadingInspectionId, setDownloadingInspectionId] = useState<string | null>(null)

  const handleDownload = async (inspectionId: string) => {
    setDownloadingInspectionId(inspectionId)
    try {
      const response = await fetch(`/api/inspections/${inspectionId}/pdf`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `inspection-${equipment.serial}-${new Date().toISOString().split('T')[0]}.pdf`
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
      setDownloadingInspectionId(null)
    }
  }

  const renderInspectionRow = (insp: Inspection) => {
    const checkpoints = insp.sections.flatMap(s => s.checkpoints)
    const criticalIssues = checkpoints.filter(cp => cp.critical && cp.status === 'ACTION_REQUIRED').length
    const nonCriticalIssues = checkpoints.filter(cp => !cp.critical && cp.status === 'ACTION_REQUIRED').length
    const totalIssues = criticalIssues + nonCriticalIssues
    const templateName = (insp as any).templateId
      ? templateNameById[(insp as any).templateId as string]
      : defaultTemplateName
    const completedCheckpoints = checkpoints.filter(cp => cp.status).length
    const totalCheckpoints = checkpoints.length
    const progressPercentage = totalCheckpoints > 0 ? Math.round((completedCheckpoints / totalCheckpoints) * 100) : 0
    const isDownloading = downloadingInspectionId === insp.id

    return (
      <tr key={insp.id} style={{ borderBottom: '1px solid #E5E7EB' }}>
        <td style={{ width: '14.2857%', padding: '12px', wordBreak: 'break-word' }}>
          <div>{require('@/lib/time').formatPDTDate(insp.startedAt)}</div>
          <div className="text-xs text-gray-500 mt-1">{require('@/lib/time').formatPDTTime(insp.startedAt)}</div>
        </td>
        <td style={{ width: '14.2857%', padding: '12px', wordBreak: 'break-word' }}>
          <div className="mb-2">{insp.status.replace(/_/g, ' ')}</div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${
                progressPercentage === 100 ? 'bg-green-500' : 
                progressPercentage > 0 ? 'bg-blue-500' : 'bg-gray-300'
              }`}
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <div className="text-xs text-gray-600 mt-1">{progressPercentage}% complete</div>
        </td>
        <td style={{ width: '14.2857%', padding: '12px', wordBreak: 'break-word' }}>{templateName ?? '—'}</td>
        <td style={{ width: '14.2857%', padding: '12px', wordBreak: 'break-word' }}>{insp.technician?.name || 'Field Tech'}</td>
        <td style={{ width: '14.2857%', padding: '12px', wordBreak: 'break-word' }}>{totalIssues > 0 ? `${totalIssues} (${criticalIssues} critical)` : 'None'}</td>
        <td style={{ width: '28.5714%', padding: '12px' }}>
          <div className="flex gap-2 items-center" style={{ whiteSpace: 'nowrap' }}>
            <Link href={`/inspections/${insp.id}`}>
              <button className="btn btn-secondary text-sm">View</button>
            </Link>
            {insp.status === 'IN_PROGRESS' && (
              <Link href={`/inspect/${equipment.id}`}>
                <button className="btn btn-warning text-sm">Continue Inspection</button>
              </Link>
            )}
            <button 
              onClick={() => handleDownload(insp.id)}
              disabled={isDownloading}
              className="btn btn-primary text-sm"
            >
              {isDownloading ? 'Downloading...' : 'Download PDF'}
            </button>
          </div>
        </td>
      </tr>
    )
  }

  const renderInspectionCard = (insp: Inspection) => {
    const checkpoints = insp.sections.flatMap(s => s.checkpoints)
    const criticalIssues = checkpoints.filter(cp => cp.critical && cp.status === 'ACTION_REQUIRED').length
    const nonCriticalIssues = checkpoints.filter(cp => !cp.critical && cp.status === 'ACTION_REQUIRED').length
    const totalIssues = criticalIssues + nonCriticalIssues
    const templateName = (insp as any).templateId
      ? templateNameById[(insp as any).templateId as string]
      : defaultTemplateName
    const completedCheckpoints = checkpoints.filter(cp => cp.status).length
    const totalCheckpoints = checkpoints.length
    const progressPercentage = totalCheckpoints > 0 ? Math.round((completedCheckpoints / totalCheckpoints) * 100) : 0
    const isDownloading = downloadingInspectionId === insp.id

    return (
      <div key={insp.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <div className="flex justify-between items-start mb-3">
          <div className="text-sm font-medium text-gray-900">
            {require('@/lib/time').formatPDTDate(insp.startedAt)}
          </div>
          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
            insp.status === 'IN_PROGRESS' ? 'bg-yellow-100 text-yellow-800' :
            insp.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {insp.status.replace(/_/g, ' ')}
          </span>
        </div>
        
        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-600">Progress:</span>
            <span className="text-sm font-medium">{progressPercentage}% complete</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className={`h-3 rounded-full transition-all duration-300 ${
                progressPercentage === 100 ? 'bg-green-500' : 
                progressPercentage > 0 ? 'bg-blue-500' : 'bg-gray-300'
              }`}
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
        
        <div className="space-y-2 mb-4">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Inspection:</span>
            <span className="font-medium">{templateName ?? '—'}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Technician:</span>
            <span className="font-medium">{insp.technician?.name || 'Field Tech'}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Issues:</span>
            <span className="font-medium">{totalIssues > 0 ? `${totalIssues} (${criticalIssues} critical)` : 'None'}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link href={`/inspections/${insp.id}`}>
            <button className="btn btn-secondary text-sm flex-1 min-w-[80px]">View</button>
          </Link>
          {insp.status === 'IN_PROGRESS' && (
            <Link href={`/inspect/${equipment.id}`}>
              <button className="btn btn-warning text-sm flex-1 min-w-[120px]">Continue</button>
            </Link>
          )}
          <button 
            onClick={() => handleDownload(insp.id)}
            disabled={isDownloading}
            className="btn btn-primary text-sm flex-1 min-w-[100px]"
          >
            {isDownloading ? 'Downloading...' : 'PDF'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="mb-8">
        <div className="mb-6">
          <Link href="/">
            <button className="btn btn-secondary">← Back to Equipment</button>
          </Link>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{equipment.model}</h1>
            <p className="text-gray-600 mt-1">
              {equipment.type.replace(/_/g, ' ')} • {equipment.serial}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              Location: <strong>{equipment.location}</strong> • Hours: <strong>{equipment.hoursUsed}</strong>
            </p>
          </div>
          <div className="flex gap-3">
            <Link href={`/inspect/${equipment.id}/select-template`}>
              <button className="btn btn-primary">Start Inspection</button>
            </Link>
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Previous Inspections</h2>
        {equipment.inspections.length === 0 ? (
          <p className="text-gray-600">No previous inspections for this equipment.</p>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block" style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', fontSize: '14px', tableLayout: 'fixed' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #E5E7EB' }}>
                    <th style={{ width: '14.2857%', padding: '12px', textAlign: 'left' }}>Date</th>
                    <th style={{ width: '14.2857%', padding: '12px', textAlign: 'left' }}>Status</th>
                    <th style={{ width: '14.2857%', padding: '12px', textAlign: 'left' }}>Inspection</th>
                    <th style={{ width: '14.2857%', padding: '12px', textAlign: 'left' }}>Technician</th>
                    <th style={{ width: '14.2857%', padding: '12px', textAlign: 'left' }}>Issues</th>
                    <th style={{ width: '28.5714%', padding: '12px', textAlign: 'left' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {equipment.inspections.map(renderInspectionRow)}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
              {equipment.inspections.map(renderInspectionCard)}
            </div>
          </>
        )}
      </div>

      {/* Download overlay */}
      {downloadingInspectionId && (
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
