'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { updateCheckpoint, completeInspection, stopInspection, markAllCheckpointsAsPass, updateTechnicianRemarks } from './actions'
import CheckpointModal from './modal'
import Lightbox from './lightbox'
import { Icons, iconSizes } from '@/lib/icons'

export default function InspectionClient({ inspection }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [currentSection, setCurrentSection] = useState(0)
  const [lightbox, setLightbox] = useState<{
    isOpen: boolean
    media: Array<{ id: string; type: string }>
    initialIndex: number
  }>({ isOpen: false, media: [], initialIndex: 0 })
  const [confirmAllModal, setConfirmAllModal] = useState<{
    isOpen: boolean
    pendingCount: number
  } | null>(null)
  const [markAllSuccessModal, setMarkAllSuccessModal] = useState<{
    isOpen: boolean
    updatedCount?: number
  } | null>(null)
  const [techRemarks, setTechRemarks] = useState<string>(inspection.technicianRemarks || '')
  const [remarksModalOpen, setRemarksModalOpen] = useState<boolean>(false)
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [modalState, setModalState] = useState<{
    isOpen: boolean
    checkpointId: string
    checkpointName: string
    status: 'CORRECTED' | 'ACTION_REQUIRED' | 'PASS' | 'NOT_APPLICABLE'
    isEditMode?: boolean
    existingData?: {
      status: string
      notes?: string
      estimatedHours?: number
      media?: Array<{ id: string; type: string }>
    }
  } | null>(null)
  const [uploadingByCheckpoint, setUploadingByCheckpoint] = useState<Record<string, boolean>>({})
  const [uploadProgressByCheckpoint, setUploadProgressByCheckpoint] = useState<Record<string, number>>({})
  const [checkpoints, setCheckpoints] = useState(() => {
    const map = {}
    inspection.sections.forEach(section => {
      section.checkpoints.forEach(cp => {
        map[cp.id] = {
          status: cp.status,
          notes: cp.notes,
          estimatedHours: cp.estimatedHours,
          media: cp.media || []
        }
      })
    })
    return map
  })

  const section = inspection.sections[currentSection]
  const totalCheckpoints = inspection.sections.reduce((sum, s) => sum + s.checkpoints.length, 0)
  const completedCheckpoints = Object.values(checkpoints).filter((cp: { status: string | null }) => cp.status).length
  const progress = (completedCheckpoints / totalCheckpoints) * 100
  const isAnyUploading = Object.values(uploadingByCheckpoint).some(Boolean)

  // Clean query parameters like create/template/taskId/serialNumber/freightId once loaded
  useEffect(() => {
    try {
      const { pathname, search } = window.location
      if (search && typeof window !== 'undefined') {
        // Replace URL with clean path to prevent accidental re-creation on refresh/complete
        window.history.replaceState({}, '', pathname)
      }
    } catch {}
  }, [])

  const handleCheckpoint = (checkpointId: string, checkpointName: string, status: string) => {
    if (status === 'NOT_APPLICABLE') {
      // N/A is instant, no modal
      setCheckpoints(prev => ({ 
        ...prev, 
        [checkpointId]: { ...prev[checkpointId], status } 
      }))
      startTransition(async () => {
        await updateCheckpoint(checkpointId, status)
      })
    } else {
      // Open modal for PASS, CORRECTED, or ACTION_REQUIRED
      setModalState({
        isOpen: true,
        checkpointId,
        checkpointName,
        status: status as 'PASS' | 'CORRECTED' | 'ACTION_REQUIRED'
      })
    }
  }

  const handleModalSubmit = async (data: {
    status: string
    notes: string
    estimatedHours?: number
    media: File[]
    removedMediaIds?: string[]
  }) => {
    if (!modalState) return

    // Update local state immediately
    // Only clear for NOT_APPLICABLE. For PASS, allow notes and media; hours remain only for ACTION_REQUIRED
    const isNA = data.status === 'NOT_APPLICABLE'
    setCheckpoints(prev => ({
      ...prev,
      [modalState.checkpointId]: {
        status: data.status,
        notes: isNA ? null : data.notes,
        estimatedHours: data.status === 'ACTION_REQUIRED' ? data.estimatedHours : null,
        media: isNA ? [] : prev[modalState.checkpointId].media
      }
    }))

    // Capture values needed before closing modal
    const captured = {
      checkpointId: modalState.checkpointId,
      existingMedia: modalState.existingData?.media as Array<{ id: string }> | undefined
    }
    // Close modal quickly for UX
    setModalState(null)

    // Do network work outside of startTransition so global isPending doesn't block UI
    try {
      setUploadingByCheckpoint(prev => ({ ...prev, [captured.checkpointId]: true }))
      setUploadProgressByCheckpoint(prev => ({ ...prev, [captured.checkpointId]: 0 }))
      const isNA = data.status === 'NOT_APPLICABLE'
      
      // If changing to N/A, delete all existing media
      if (isNA && captured.existingMedia) {
        for (const media of captured.existingMedia) {
          await fetch(`/api/media/${media.id}`, {
            method: 'DELETE'
          })
        }
      } else {
        // Otherwise handle media normally
        // Upload new media if any
        if (data.media.length > 0) {
          const photos = data.media.filter(f => f.type.startsWith('image'))
          const videos = data.media.filter(f => f.type.startsWith('video'))

          // Upload photos via existing API (stored in DB)
          if (photos.length > 0) {
            const formData = new FormData()
            formData.append('checkpointId', captured.checkpointId)
            photos.forEach(file => {
              formData.append('files', file)
            })
            const response = await fetch('/api/upload', {
              method: 'POST',
              body: formData
            })
            if (response.ok) {
              const { media } = await response.json()
              setCheckpoints(prev => ({
                ...prev,
                [captured.checkpointId]: {
                  ...prev[captured.checkpointId],
                  media: [...prev[modalState.checkpointId].media, ...media]
                }
              }))
            }
          }

          // Upload videos to S3 via presigned POST, then finalize
          for (const file of videos) {
            try {
              const presignRes = await fetch('/api/upload/presign', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  checkpointId: captured.checkpointId,
                  filename: file.name,
                  contentType: file.type
                })
              })
              if (!presignRes.ok) continue
              const { upload, key } = await presignRes.json()

              const s3Form = new FormData()
              Object.entries(upload.fields).forEach(([k, v]) => {
                s3Form.append(k, v as any)
              })
              s3Form.append('file', file)

              // Upload with progress using XHR; fall back to fetch if needed
              const s3Posted = await new Promise<boolean>((resolve) => {
                try {
                  const xhr = new XMLHttpRequest()
                  xhr.open('POST', upload.url, true)
                  xhr.upload.onprogress = (evt) => {
                    if (evt.lengthComputable) {
                      const percent = Math.round((evt.loaded / evt.total) * 100)
                      setUploadProgressByCheckpoint(prev => ({ ...prev, [captured.checkpointId]: percent }))
                    } else {
                      setUploadProgressByCheckpoint(prev => ({ ...prev, [captured.checkpointId]: 50 }))
                    }
                  }
                  xhr.onload = () => {
                    // S3 may return 204/201/200
                    resolve(xhr.status >= 200 && xhr.status < 300)
                  }
                  xhr.onerror = () => resolve(false)
                  xhr.timeout = 0
                  xhr.send(s3Form as any)
                } catch (e) {
                  resolve(false)
                }
              })

              if (!s3Posted) {
                // As a last resort, try fetch no-cors so we don't block the flow
                try {
                  await fetch(upload.url, { method: 'POST', body: s3Form, mode: 'no-cors' })
                } catch {}
              }

              const finalizeRes = await fetch('/api/upload/finalize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  checkpointId: captured.checkpointId,
                  key,
                  filename: file.name,
                  mimeType: file.type,
                  size: file.size
                })
              })
              if (finalizeRes.ok) {
                const { media } = await finalizeRes.json()
                setCheckpoints(prev => ({
                  ...prev,
                  [captured.checkpointId]: {
                    ...prev[captured.checkpointId],
                    media: [...prev[captured.checkpointId].media, media]
                  }
                }))
                setUploadProgressByCheckpoint(prev => ({ ...prev, [captured.checkpointId]: 100 }))
              }
            } catch (e) {
              console.error('Video upload failed', e)
            }
          }
        }

        // Remove deleted media if any
        if (data.removedMediaIds && data.removedMediaIds.length > 0) {
          for (const mediaId of data.removedMediaIds) {
            await fetch(`/api/media/${mediaId}`, {
              method: 'DELETE'
            })
          }
          // Update local state to remove deleted media
          setCheckpoints(prev => ({
            ...prev,
            [captured.checkpointId]: {
              ...prev[captured.checkpointId],
              media: prev[captured.checkpointId].media.filter(
                (m: { id: string }) => !data.removedMediaIds?.includes(m.id)
              )
            }
          }))
        }
      }
      
      // Update checkpoint in database (small transition OK)
      await updateCheckpoint(
        captured.checkpointId,
        data.status,
        isNA ? null : data.notes,
        data.status === 'ACTION_REQUIRED' ? data.estimatedHours ?? null : null
      )
    } finally {
      setUploadingByCheckpoint(prev => ({ ...prev, [captured.checkpointId]: false }))
      // Clear progress indicator shortly after
      setTimeout(() => {
        setUploadProgressByCheckpoint(prev => {
          const copy = { ...prev }
          delete copy[captured.checkpointId]
          return copy
        })
      }, 1000)
    }
  }

  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean
    title: string
    message: string
    type: 'error' | 'warning' | 'info'
  } | null>(null)

  const handleComplete = async () => {
    if (isAnyUploading) {
      setAlertModal({
        isOpen: true,
        title: 'Uploads in Progress',
        message: 'Please wait for all uploads to finish before completing the inspection.',
        type: 'warning'
      })
      return
    }
    if (completedCheckpoints !== totalCheckpoints) {
      setAlertModal({
        isOpen: true,
        title: 'Incomplete Inspection',
        message: `Please complete all checkpoints (${completedCheckpoints}/${totalCheckpoints})`,
        type: 'warning'
      })
      return
    }
    // Open remarks modal to prompt the user before completing
    setRemarksModalOpen(true)
  }

  const finalizeCompletion = async () => {
    try {
      setIsSubmitting(true)
      // Save remarks first (best-effort; do not block completion on failure)
      try {
        await updateTechnicianRemarks(inspection.id, techRemarks)
      } catch {}

      console.log('Completing inspection:', inspection.id)
      const result = await completeInspection(inspection.id)
      console.log('Complete result:', result)
      
      if (result?.success) {
        router.push('/')
        router.refresh()
      } else {
        setIsSubmitting(false)
        setAlertModal({
          isOpen: true,
          title: 'Completion Failed',
          message: 'Failed to complete inspection. Please try again.',
          type: 'error'
        })
      }
    } catch (error) {
      console.error('Error completing inspection')
      setIsSubmitting(false)
      setAlertModal({
        isOpen: true,
        title: 'Error',
        message: 'An error occurred while completing the inspection.',
        type: 'error'
      })
    }
  }

  const handleStopInspection = async () => {
    const confirmed = confirm(
      'Are you sure you want to stop this inspection? All progress will be lost and you will need to start over.'
    )
    
    if (confirmed) {
      const result = await stopInspection(inspection.id)
      if (result.success) {
        // Use window.location for a hard refresh to ensure data is refetched
        window.location.href = '/'
      } else {
        setAlertModal({
          isOpen: true,
          title: 'Stop Failed',
          message: 'Failed to stop inspection. Please try again.',
          type: 'error'
        })
      }
    }
  }

  const handleMarkAllAsPass = async () => {
    const pendingCheckpoints = Object.entries(checkpoints).filter(([, cp]: [string, any]) => !cp.status).length
    
    if (pendingCheckpoints === 0) {
      setAlertModal({
        isOpen: true,
        title: 'No Pending Checkpoints',
        message: 'All checkpoints already have a status.',
        type: 'info'
      })
      return
    }
    setConfirmAllModal({ isOpen: true, pendingCount: pendingCheckpoints })
  }

  const executeMarkAllAsPass = () => {
    setConfirmAllModal(null)
    startTransition(async () => {
      const result = await markAllCheckpointsAsPass(inspection.id)
      if (result.success) {
        // Update local state to reflect all checkpoints as PASS
        const updatedCheckpoints = { ...checkpoints }
        Object.keys(updatedCheckpoints).forEach(checkpointId => {
          if (!updatedCheckpoints[checkpointId].status) {
            updatedCheckpoints[checkpointId] = {
              ...updatedCheckpoints[checkpointId],
              status: 'PASS',
              notes: null,
              estimatedHours: null,
              media: []
            }
          }
        })
        setCheckpoints(updatedCheckpoints)
        setMarkAllSuccessModal({ isOpen: true, updatedCount: result.updatedCount })
      } else {
        setAlertModal({
          isOpen: true,
          title: 'Mark All Failed',
          message: 'Failed to mark checkpoints as pass. Please try again.',
          type: 'error'
        })
      }
    })
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-50">
      {/* Mobile Header - Made much larger */}
      <div className="md:hidden bg-white border-b border-gray-200 sticky top-0 z-40">
        {/* Equipment info and control buttons */}
        <div className="p-4 bg-gray-50">
          <div className="flex items-center justify-between gap-3 mb-3">
            <button
              onClick={() => router.push('/')}
              className="bg-indigo-600 text-white min-h-[60px] px-5 flex items-center gap-2 rounded-lg font-semibold border-2 border-indigo-700 hover:bg-indigo-700 active:bg-indigo-800 transition-all"
            >
              <Icons.back className="w-6 h-6" />
              <span className="font-semibold text-base">Back</span>
            </button>
            
            <div className="text-center flex-1">
              <div className="font-bold text-base">{inspection.equipment.model}</div>
              <div className="text-sm text-gray-600">{inspection.equipment.serial}</div>
            </div>
            
            <button
              onClick={handleStopInspection}
              disabled={isPending}
              className="btn btn-danger min-h-[60px] px-5 flex items-center gap-2"
              title="Stop inspection"
            >
              <Icons.close className="w-6 h-6" />
              <span className="font-semibold text-base">Stop</span>
            </button>
          </div>
          
          {/* Progress bar */}
          <div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div className="bg-blue-600 h-3 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
            </div>
            <div className="text-sm text-gray-700 mt-2 text-center font-medium">
              {completedCheckpoints}/{totalCheckpoints} checkpoints completed
            </div>
          </div>
        </div>
        
        {/* Mobile sections - larger and more spaced */}
        <div className="bg-white px-4 py-4 border-t border-gray-200">
          <div className="overflow-x-auto -mx-4 px-4">
            <div className="flex gap-3 pb-2 pt-2">
              {inspection.sections.map((s, i) => {
                const sectionCompleted = s.checkpoints.filter(cp => checkpoints[cp.id]?.status).length
                const sectionTotal = s.checkpoints.length
                const sectionProgress = (sectionCompleted / sectionTotal) * 100
                const isComplete = sectionCompleted === sectionTotal
                
                return (
                  <button
                    key={s.id}
                    onClick={() => setCurrentSection(i)}
                    className={`flex-shrink-0 min-h-[90px] min-w-[160px] px-6 py-3 rounded-xl transition-all border-2 ${
                      i === currentSection 
                        ? 'bg-blue-100 text-blue-700 border-blue-600 shadow-xl scale-105' 
                        : isComplete
                        ? 'bg-green-50 text-green-700 border-green-500'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <div className="text-left">
                      <div className="font-bold text-base whitespace-nowrap">{s.name}</div>
                      <div className="text-xs mt-1 mb-2">
                        {sectionCompleted}/{sectionTotal} done
                        {isComplete && (
                          <Icons.checkCircle className="inline-block w-4 h-4 ml-1 text-green-600" />
                        )}
                      </div>
                      {/* Progress bar */}
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-300 ${
                            sectionProgress === 100 ? 'bg-green-500' : 
                            sectionProgress > 0 ? 'bg-blue-500' : 'bg-gray-300'
                          }`}
                          style={{ width: `${sectionProgress}%` }}
                        />
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Sidebar - unchanged */}
      <div className="hidden md:block md:w-64 bg-white md:bg-gray-50 md:border-r border-gray-200">
        <div className="h-full flex flex-col">
          {/* Desktop header */}
          <div className="p-4 border-b border-gray-200">
            <button
              onClick={() => router.push('/')}
              className="btn btn-secondary inline-flex items-center gap-2 py-2 px-3 text-sm w-full"
            >
              <Icons.back className={iconSizes.sm} />
              <span>Back to Equipment</span>
            </button>
            <div className="text-center mt-4">
              <div className="font-semibold text-base">{inspection.equipment.model}</div>
              <div className="text-sm text-gray-500 mt-1">{inspection.equipment.serial}</div>
            </div>
            <div className="mt-4">
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
              </div>
              <div className="text-sm text-gray-600 mt-2 text-center">
                {completedCheckpoints}/{totalCheckpoints} completed
              </div>
            </div>
          </div>

          {/* Desktop sections list */}
          <div className="flex-1 overflow-y-auto p-4">
            {inspection.sections.map((s, i) => {
              const sectionCompleted = s.checkpoints.filter(cp => checkpoints[cp.id]?.status).length
              const sectionTotal = s.checkpoints.length
              const sectionProgress = (sectionCompleted / sectionTotal) * 100
              
              return (
                <button
                  key={s.id}
                  onClick={() => setCurrentSection(i)}
                  className={`w-full text-left p-3 mb-2 rounded-lg transition-all ${
                    i === currentSection 
                      ? 'bg-blue-100 text-blue-700 border-l-4 border-blue-600' 
                      : 'hover:bg-teal-50 border border-gray-200'
                  }`}
                >
                  <div className="font-semibold">{s.name}</div>
                  <div className="text-xs text-gray-500 mt-1 mb-2">
                    {sectionCompleted}/{sectionTotal} done
                  </div>
                  {/* Progress bar */}
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        sectionProgress === 100 ? 'bg-green-500' : 
                        sectionProgress > 0 ? 'bg-blue-500' : 'bg-gray-300'
                      }`}
                      style={{ width: `${sectionProgress}%` }}
                    />
                  </div>
                </button>
              )
            })}
          </div>
          
          {/* Desktop complete/stop buttons */}
          <div className="p-4 border-t border-gray-200">
            <button
              onClick={handleMarkAllAsPass}
              disabled={isPending || isSubmitting || Object.entries(checkpoints).filter(([, cp]: [string, any]) => !cp.status).length === 0}
              className="btn btn-success w-full mb-2 text-sm"
              title="Mark all remaining checkpoints as PASS"
            >
              Mark All as Pass
            </button>
            <button
              onClick={handleComplete}
              disabled={completedCheckpoints < totalCheckpoints || isPending || isAnyUploading || isSubmitting}
              className="btn btn-primary w-full mb-2 text-sm"
            >
              Complete Inspection ({completedCheckpoints}/{totalCheckpoints})
            </button>
            <button
              onClick={handleStopInspection}
              disabled={isPending || isSubmitting}
              className="btn btn-danger w-full text-sm opacity-80 hover:opacity-100"
              title="Stop inspection and start over"
            >
              Stop Inspection
            </button>
          </div>
        </div>
      </div>

      {/* Main content area - better mobile spacing */}
      <div className="flex-1 overflow-y-auto pb-24 md:pb-0">
        <div className="p-4 md:p-6 max-w-7xl mx-auto">
          <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-4 md:mb-6">
            Section: {section.name}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {section.checkpoints.map(checkpoint => {
              const cpData = checkpoints[checkpoint.id]
              return (
                <div key={checkpoint.id} className="card p-4">
              <div className="mb-4">
                <div className="mb-2">
                  {checkpoint.critical && (
                    <span className="px-2 py-1 text-xs font-bold bg-red-100 text-red-700 rounded-full">CRITICAL</span>
                  )}
                </div>
                <div className="text-base text-gray-900 font-medium">{checkpoint.name}</div>
              </div>

              {cpData.status ? (
                <>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className={`flex-1 p-3 rounded-lg text-center font-bold text-base ${
                      cpData.status === 'PASS' ? 'bg-green-100 text-green-800' :
                      cpData.status === 'CORRECTED' ? 'bg-yellow-100 text-yellow-800' : 
                      cpData.status === 'NOT_APPLICABLE' ? 'bg-gray-100 text-gray-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {cpData.status === 'NOT_APPLICABLE' ? 'N/A' : cpData.status.replace('_', ' ')}
                    </div>
                    <button
                      onClick={() => {
                        // Open edit modal with existing data
                        setModalState({
                          isOpen: true,
                          checkpointId: checkpoint.id,
                          checkpointName: checkpoint.name,
                          status: cpData.status as 'PASS' | 'CORRECTED' | 'ACTION_REQUIRED' | 'NOT_APPLICABLE',
                          isEditMode: true,
                          existingData: {
                            status: cpData.status,
                            notes: cpData.notes,
                            estimatedHours: cpData.estimatedHours,
                            media: cpData.media
                          }
                        })
                      }}
                      disabled={!!uploadingByCheckpoint[checkpoint.id]}
                      className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-semibold disabled:opacity-60"
                    >
                      Edit
                    </button>
                  </div>
                  
                  {/* Show notes if exists */}
                  {cpData.notes && (
                    <div className="mt-3 p-3 bg-gray-100 rounded-lg text-sm">
                      <strong>Notes:</strong> {cpData.notes}
                    </div>
                  )}
                  
                  {/* Show estimated hours if exists */}
                  {cpData.estimatedHours && (
                    <div className="mt-2 text-sm text-gray-600">
                      <strong>Estimated Hours:</strong> {cpData.estimatedHours}
                    </div>
                  )}
                  
                  {/* Show media thumbnails */}
                  {cpData.media && cpData.media.length > 0 && (
                    <div className="mt-3 flex gap-2 overflow-x-auto">
                      {cpData.media.map((m: { id: string; type: string }, index: number) => (
                        <button
                          key={m.id}
                          onClick={() => setLightbox({
                            isOpen: true,
                            media: cpData.media,
                            initialIndex: index
                          })}
                          className="flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                        >
                          {m.type === 'video' ? (
                            <div className="w-16 h-16 bg-blue-500 rounded-lg flex items-center justify-center text-white">
                              <Icons.video className="w-8 h-8" />
                            </div>
                          ) : (
                            <Image
                              src={`/api/media/${m.id}`}
                              alt="Inspection media"
                              width={64}
                              height={64}
                              className="w-16 h-16 object-cover rounded-lg border-2 border-gray-300"
                            />
                          )}
                        </button>
                      ))}
                    </div>
                  )}

                  {uploadProgressByCheckpoint[checkpoint.id] !== undefined && (
                    <div className="mt-3">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="h-2 rounded-full bg-blue-600 transition-all"
                          style={{ width: `${uploadProgressByCheckpoint[checkpoint.id]}%` }}
                        />
                      </div>
                      <div className="text-xs text-gray-600 mt-1 text-center">
                        Uploading... {uploadProgressByCheckpoint[checkpoint.id]}%
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleCheckpoint(checkpoint.id, checkpoint.name, 'PASS')}
                    className="bg-green-500 text-white min-h-[60px] text-base font-bold py-4 px-2 rounded-lg border-2 border-green-600 shadow-lg hover:bg-green-600 active:bg-green-700 disabled:opacity-60 transition-all"
                    disabled={!!uploadingByCheckpoint[checkpoint.id]}
                  >
                    PASS
                  </button>
                  <button
                    onClick={() => handleCheckpoint(checkpoint.id, checkpoint.name, 'CORRECTED')}
                    className="bg-yellow-500 text-gray-900 min-h-[60px] text-base font-bold py-4 px-1 rounded-lg border-2 border-yellow-600 shadow-lg hover:bg-yellow-400 active:bg-yellow-600 disabled:opacity-60 transition-all"
                    disabled={!!uploadingByCheckpoint[checkpoint.id]}
                  >
                    FIXED
                  </button>
                  <button
                    onClick={() => handleCheckpoint(checkpoint.id, checkpoint.name, 'ACTION_REQUIRED')}
                    className="bg-red-500 text-white min-h-[60px] text-base font-bold py-4 px-1 rounded-lg border-2 border-red-600 shadow-lg hover:bg-red-600 active:bg-red-700 disabled:opacity-60 transition-all"
                    disabled={!!uploadingByCheckpoint[checkpoint.id]}
                  >
                    ACTION
                  </button>
                  <button
                    onClick={() => handleCheckpoint(checkpoint.id, checkpoint.name, 'NOT_APPLICABLE')}
                    className="bg-gray-500 text-white min-h-[60px] text-base font-bold py-4 px-1 rounded-lg border-2 border-gray-600 shadow-lg hover:bg-gray-600 active:bg-gray-700 disabled:opacity-60 transition-all"
                    disabled={!!uploadingByCheckpoint[checkpoint.id]}
                  >
                    N/A
                  </button>
                  {uploadProgressByCheckpoint[checkpoint.id] !== undefined && (
                    <div className="col-span-2 mt-2">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="h-2 rounded-full bg-blue-600 transition-all"
                          style={{ width: `${uploadProgressByCheckpoint[checkpoint.id]}%` }}
                        />
                      </div>
                      <div className="text-xs text-gray-600 mt-1 text-center">
                        Uploading... {uploadProgressByCheckpoint[checkpoint.id]}%
                      </div>
                    </div>
                  )}
                </div>
              )}
                </div>
              )
            })}
          </div>

        </div>
      </div>

      {/* Mobile bottom bar - bigger button */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t-2 border-gray-400 p-4 z-30 shadow-2xl">
        <div className="flex gap-2">
          <button
            onClick={handleMarkAllAsPass}
            disabled={isPending || isSubmitting || Object.entries(checkpoints).filter(([, cp]: [string, any]) => !cp.status).length === 0}
            className="bg-green-600 text-white flex-1 min-h-[70px] text-base font-bold shadow-xl rounded-lg border-2 border-green-800 hover:bg-green-700 active:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            MARK ALL PASS
          </button>
          <button
            onClick={handleComplete}
            disabled={completedCheckpoints < totalCheckpoints || isPending || isSubmitting}
            className="bg-blue-700 text-white flex-1 min-h-[70px] text-base font-bold shadow-xl rounded-lg border-2 border-blue-900 hover:bg-blue-800 active:bg-blue-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            COMPLETE ({completedCheckpoints}/{totalCheckpoints})
          </button>
        </div>
      </div>

      {/* Modal */}
      {modalState && (
        <CheckpointModal
          isOpen={modalState.isOpen}
          onClose={() => setModalState(null)}
          onSubmit={handleModalSubmit}
          status={modalState.status}
          checkpointName={modalState.checkpointName}
          isEditMode={modalState.isEditMode}
          existingData={modalState.existingData}
        />
      )}

      {/* Submitting overlay */}
      {isSubmitting && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 shadow-xl w-full max-w-sm text-center">
            <div className="mx-auto mb-4 h-10 w-10 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
            <h3 className="text-lg font-semibold text-gray-900">Submitting Inspection</h3>
            <p className="text-sm text-gray-600 mt-1">Please wait while we finalize your report…</p>
          </div>
        </div>
      )}

      {/* Confirm Mark All as PASS Modal */}
      {confirmAllModal?.isOpen && (
        <div className="modal-overlay">
          <div className="modal-content max-w-md p-6">
            <div className="mb-4">
              <h2 className="text-lg font-semibold">Mark All as PASS?</h2>
              <p className="text-sm text-gray-600 mt-2">
                Are you sure you want to mark all {confirmAllModal.pendingCount} remaining checkpoints as PASS? This action cannot be undone.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmAllModal(null)}
                className="btn btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={executeMarkAllAsPass}
                className="btn btn-success flex-1"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal for Mark All as PASS */}
      {markAllSuccessModal?.isOpen && (
        <div className="modal-overlay">
          <div className="modal-content max-w-md p-6">
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-gray-900">All Set</h2>
              <p className="text-sm text-gray-600 mt-2">
                {typeof markAllSuccessModal.updatedCount === 'number'
                  ? `Successfully marked ${markAllSuccessModal.updatedCount} checkpoints as PASS.`
                  : 'Successfully marked all remaining checkpoints as PASS.'}
              </p>
            </div>
            <button
              onClick={() => setMarkAllSuccessModal(null)}
              className="btn btn-primary w-full"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* Technician Remarks Modal (before completion) */}
      {remarksModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content max-w-lg p-6">
            <div className="mb-4">
              <h2 className="text-lg font-semibold">Technician Remarks</h2>
              <p className="text-sm text-gray-600 mt-1">Add any final notes or recommendations.</p>
            </div>
            <textarea
              value={techRemarks}
              onChange={(e) => setTechRemarks(e.target.value)}
              rows={5}
              className="form-textarea"
              placeholder="Enter remarks (optional)"
            />
            <div className="mt-4 flex gap-3 justify-end">
              <button
                onClick={() => setRemarksModalOpen(false)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setRemarksModalOpen(false)
                  await finalizeCompletion()
                }}
                className="btn btn-primary"
              >
                Submit & Complete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox */}
      <Lightbox
        isOpen={lightbox.isOpen}
        onClose={() => setLightbox({ isOpen: false, media: [], initialIndex: 0 })}
        media={lightbox.media}
        initialIndex={lightbox.initialIndex}
      />

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