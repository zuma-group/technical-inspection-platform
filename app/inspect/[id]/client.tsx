'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { updateCheckpoint, completeInspection, stopInspection, markAllCheckpointsAsPass } from './actions'
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

  const handleCheckpoint = (checkpointId: string, checkpointName: string, status: string) => {
    if (status === 'PASS' || status === 'NOT_APPLICABLE') {
      // Pass and N/A are instant, no modal
      setCheckpoints(prev => ({ 
        ...prev, 
        [checkpointId]: { ...prev[checkpointId], status } 
      }))
      startTransition(async () => {
        await updateCheckpoint(checkpointId, status)
      })
    } else {
      // Open modal for Corrected or Action Required
      setModalState({
        isOpen: true,
        checkpointId,
        checkpointName,
        status: status as 'CORRECTED' | 'ACTION_REQUIRED'
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
    // Clear notes, hours, and media for PASS and NOT_APPLICABLE statuses
    const shouldClearData = data.status === 'PASS' || data.status === 'NOT_APPLICABLE'
    
    setCheckpoints(prev => ({
      ...prev,
      [modalState.checkpointId]: {
        status: data.status,
        notes: shouldClearData ? null : data.notes,
        estimatedHours: shouldClearData ? null : data.estimatedHours,
        media: shouldClearData ? [] : prev[modalState.checkpointId].media
      }
    }))

    // Close modal
    setModalState(null)

    startTransition(async () => {
      const shouldClearData = data.status === 'PASS' || data.status === 'NOT_APPLICABLE'
      
      // If changing to PASS or N/A, delete all existing media
      if (shouldClearData && modalState.existingData?.media) {
        for (const media of modalState.existingData.media) {
          await fetch(`/api/media/${media.id}`, {
            method: 'DELETE'
          })
        }
      } else {
        // Otherwise handle media normally
        // Upload new media if any
        if (data.media.length > 0) {
          const formData = new FormData()
          formData.append('checkpointId', modalState.checkpointId)
          data.media.forEach(file => {
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
              [modalState.checkpointId]: {
                ...prev[modalState.checkpointId],
                media: [...prev[modalState.checkpointId].media, ...media]
              }
            }))
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
            [modalState.checkpointId]: {
              ...prev[modalState.checkpointId],
              media: prev[modalState.checkpointId].media.filter(
                (m: { id: string }) => !data.removedMediaIds?.includes(m.id)
              )
            }
          }))
        }
      }

      // Update checkpoint in database
      // Clear notes and hours for PASS and N/A statuses
      await updateCheckpoint(
        modalState.checkpointId, 
        data.status, 
        shouldClearData ? null : data.notes,
        shouldClearData ? null : data.estimatedHours
      )
    })
  }

  const handleComplete = async () => {
    if (completedCheckpoints !== totalCheckpoints) {
      alert(`Please complete all checkpoints (${completedCheckpoints}/${totalCheckpoints})`)
      return
    }
    
    try {
      console.log('Completing inspection:', inspection.id)
      const result = await completeInspection(inspection.id)
      console.log('Complete result:', result)
      
      if (result?.success) {
        // Use Next.js router for smooth navigation
        router.push('/')
        router.refresh()
      } else {
        alert('Failed to complete inspection. Please try again.')
      }
    } catch (error) {
      // Don't log the full error object to avoid the 431 issue
      console.error('Error completing inspection')
      alert('An error occurred while completing the inspection.')
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
        alert('Failed to stop inspection. Please try again.')
      }
    }
  }

  const handleMarkAllAsPass = async () => {
    const pendingCheckpoints = Object.entries(checkpoints).filter(([id, cp]: [string, any]) => !cp.status).length
    
    if (pendingCheckpoints === 0) {
      alert('All checkpoints already have a status.')
      return
    }

    const confirmed = confirm(
      `Are you sure you want to mark all ${pendingCheckpoints} remaining checkpoints as PASS? This action cannot be undone.`
    )
    
    if (confirmed) {
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
          
          if (result.updatedCount) {
            alert(`Successfully marked ${result.updatedCount} checkpoints as PASS.`)
          }
        } else {
          alert('Failed to mark checkpoints as pass. Please try again.')
        }
      })
    }
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
              disabled={isPending || Object.entries(checkpoints).filter(([id, cp]: [string, any]) => !cp.status).length === 0}
              className="btn btn-success w-full mb-2 text-sm"
              title="Mark all remaining checkpoints as PASS"
            >
              Mark All as Pass
            </button>
            <button
              onClick={handleComplete}
              disabled={completedCheckpoints < totalCheckpoints || isPending}
              className="btn btn-primary w-full mb-2 text-sm"
            >
              Complete Inspection ({completedCheckpoints}/{totalCheckpoints})
            </button>
            <button
              onClick={handleStopInspection}
              disabled={isPending}
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
                      className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-semibold"
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
                </>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleCheckpoint(checkpoint.id, checkpoint.name, 'PASS')}
                    className="bg-green-500 text-white min-h-[60px] text-base font-bold py-4 px-2 rounded-lg border-2 border-green-600 shadow-lg hover:bg-green-600 active:bg-green-700 disabled:opacity-60 transition-all"
                    disabled={isPending}
                  >
                    PASS
                  </button>
                  <button
                    onClick={() => handleCheckpoint(checkpoint.id, checkpoint.name, 'CORRECTED')}
                    className="bg-yellow-500 text-gray-900 min-h-[60px] text-base font-bold py-4 px-1 rounded-lg border-2 border-yellow-600 shadow-lg hover:bg-yellow-400 active:bg-yellow-600 disabled:opacity-60 transition-all"
                    disabled={isPending}
                  >
                    FIXED
                  </button>
                  <button
                    onClick={() => handleCheckpoint(checkpoint.id, checkpoint.name, 'ACTION_REQUIRED')}
                    className="bg-red-500 text-white min-h-[60px] text-base font-bold py-4 px-1 rounded-lg border-2 border-red-600 shadow-lg hover:bg-red-600 active:bg-red-700 disabled:opacity-60 transition-all"
                    disabled={isPending}
                  >
                    ACTION
                  </button>
                  <button
                    onClick={() => handleCheckpoint(checkpoint.id, checkpoint.name, 'NOT_APPLICABLE')}
                    className="bg-gray-500 text-white min-h-[60px] text-base font-bold py-4 px-1 rounded-lg border-2 border-gray-600 shadow-lg hover:bg-gray-600 active:bg-gray-700 disabled:opacity-60 transition-all"
                    disabled={isPending}
                  >
                    N/A
                  </button>
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
            disabled={isPending || Object.entries(checkpoints).filter(([id, cp]: [string, any]) => !cp.status).length === 0}
            className="bg-green-600 text-white flex-1 min-h-[70px] text-base font-bold shadow-xl rounded-lg border-2 border-green-800 hover:bg-green-700 active:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            MARK ALL PASS
          </button>
          <button
            onClick={handleComplete}
            disabled={completedCheckpoints < totalCheckpoints || isPending}
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

      {/* Lightbox */}
      <Lightbox
        isOpen={lightbox.isOpen}
        onClose={() => setLightbox({ isOpen: false, media: [], initialIndex: 0 })}
        media={lightbox.media}
        initialIndex={lightbox.initialIndex}
      />
    </div>
  )
}