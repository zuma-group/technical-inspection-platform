'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { updateCheckpoint, completeInspection, stopInspection } from './actions'
import CheckpointModal from './modal'
import { Icons, iconSizes } from '@/lib/icons'

export default function InspectionClient({ inspection }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [currentSection, setCurrentSection] = useState(0)
  const [modalState, setModalState] = useState<{
    isOpen: boolean
    checkpointId: string
    checkpointName: string
    status: 'CORRECTED' | 'ACTION_REQUIRED'
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
    if (status === 'PASS') {
      // Pass is instant, no modal
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
  }) => {
    if (!modalState) return

    // Update local state immediately
    setCheckpoints(prev => ({
      ...prev,
      [modalState.checkpointId]: {
        status: data.status,
        notes: data.notes,
        estimatedHours: data.estimatedHours,
        media: prev[modalState.checkpointId].media
      }
    }))

    // Close modal
    setModalState(null)

    startTransition(async () => {
      // Upload media if any
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

      // Update checkpoint in database
      await updateCheckpoint(
        modalState.checkpointId, 
        data.status, 
        data.notes,
        data.estimatedHours
      )
    })
  }

  const handleComplete = () => {
    if (completedCheckpoints === totalCheckpoints) {
      startTransition(async () => {
        await completeInspection(inspection.id)
        router.push('/')
      })
    }
  }

  const handleStopInspection = () => {
    const confirmed = confirm(
      'Are you sure you want to stop this inspection? All progress will be lost and you will need to start over.'
    )
    
    if (confirmed) {
      startTransition(async () => {
        const result = await stopInspection(inspection.id)
        if (result.success) {
          router.push(`/inspect/${inspection.equipmentId}/select-template`)
        } else {
          alert('Failed to stop inspection. Please try again.')
        }
      })
    }
  }

  return (
    <div className="flex h-screen">
      <div className="w-64 bg-gray-50 border-r border-gray-200 flex flex-col">
        <div className="p-4 flex-1 flex flex-col">
          <div className="mb-4">
            <button
              onClick={() => router.push('/')}
              className="btn btn-secondary inline-flex items-center gap-2 py-2 px-3 text-sm w-full"
            >
              <Icons.back className={iconSizes.sm} />
              <span>Back</span>
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

          <div className="flex-1 overflow-y-auto mt-4">
            {inspection.sections.map((s, i) => (
              <button
                key={s.id}
                onClick={() => setCurrentSection(i)}
                className={`w-full text-left p-3 mb-2 rounded-lg transition-all ${
                  i === currentSection 
                    ? 'bg-blue-100 text-blue-700 border-l-4 border-blue-600' 
                    : 'hover:bg-gray-100'
                }`}
              >
                <div className="font-semibold">{s.code}</div>
                <div className="text-sm text-gray-600 mt-1">
                  {s.name}
                </div>
              </button>
            ))}
          </div>
          
          <div className="mt-auto pt-4 border-t border-gray-200">
            <button
              onClick={handleComplete}
              disabled={completedCheckpoints < totalCheckpoints || isPending}
              className="btn btn-primary w-full mb-3"
            >
              Complete Inspection ({completedCheckpoints}/{totalCheckpoints})
            </button>
            
            <button
              onClick={handleStopInspection}
              disabled={isPending}
              className="btn btn-danger w-full opacity-80 hover:opacity-100"
              title="Stop inspection and start over"
            >
              Stop Inspection
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            {section.name}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {section.checkpoints.map(checkpoint => {
              const cpData = checkpoints[checkpoint.id]
              return (
                <div key={checkpoint.id} className="card">
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-semibold text-gray-600">{checkpoint.code}</span>
                  {checkpoint.critical && (
                    <span className="px-2 py-1 text-xs font-bold bg-red-100 text-red-700 rounded-full">CRITICAL</span>
                  )}
                </div>
                <div className="text-gray-900 font-medium">{checkpoint.name}</div>
              </div>

              {cpData.status ? (
                <>
                  <div className={`p-3 rounded-md text-center font-semibold ${
                    cpData.status === 'PASS' ? 'bg-green-100 text-green-800' :
                    cpData.status === 'CORRECTED' ? 'bg-yellow-100 text-yellow-800' : 
                    'bg-red-100 text-red-800'
                  }`}>
                    {cpData.status.replace('_', ' ')}
                  </div>
                  
                  {/* Show notes if exists */}
                  {cpData.notes && (
                    <div className="mt-3 p-2 bg-gray-100 rounded-md text-sm">
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
                      {cpData.media.map((m: { id: string; type: string }) => (
                        <a 
                          key={m.id} 
                          href={`/api/media/${m.id}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex-shrink-0"
                        >
                          {m.type === 'video' ? (
                            <div className="w-[60px] h-[60px] bg-blue-500 rounded-lg flex items-center justify-center text-white">
                              <Icons.video className={iconSizes.lg} />
                            </div>
                          ) : (
                            <Image
                              src={`/api/media/${m.id}`}
                              alt="Inspection media"
                              width={60}
                              height={60}
                              className="object-cover rounded-lg border-2 border-gray-300"
                            />
                          )}
                        </a>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => handleCheckpoint(checkpoint.id, checkpoint.name, 'PASS')}
                    className="btn btn-success text-sm py-2"
                    disabled={isPending}
                  >
                    Pass
                  </button>
                  <button
                    onClick={() => handleCheckpoint(checkpoint.id, checkpoint.name, 'CORRECTED')}
                    className="btn btn-warning text-sm py-2"
                    disabled={isPending}
                  >
                    Corrected
                  </button>
                  <button
                    onClick={() => handleCheckpoint(checkpoint.id, checkpoint.name, 'ACTION_REQUIRED')}
                    className="btn btn-danger text-sm py-2"
                    disabled={isPending}
                  >
                    Action
                  </button>
                </div>
              )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 md:hidden">
        <button
          onClick={handleComplete}
          disabled={completedCheckpoints < totalCheckpoints || isPending}
          className="btn btn-primary w-full"
        >
          Complete Inspection ({completedCheckpoints}/{totalCheckpoints})
        </button>
      </div>

      {/* Modal */}
      {modalState && (
        <CheckpointModal
          isOpen={modalState.isOpen}
          onClose={() => setModalState(null)}
          onSubmit={handleModalSubmit}
          status={modalState.status}
          checkpointName={modalState.checkpointName}
        />
      )}
    </div>
  )
}