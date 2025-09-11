'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { updateCheckpoint, completeInspection, stopInspection } from './actions'
import CheckpointModal from './modal'

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
    <div className="inspection-layout">
      <div className="inspection-sidebar">
        <div className="header" style={{ position: 'relative', background: 'transparent', border: 'none' }}>
          <div className="header-content">
            <button
              onClick={() => router.push('/')}
              className="btn btn-secondary back-button"
              style={{ padding: '8px 12px', marginBottom: '16px', fontSize: '14px' }}
            >
              ← Back
            </button>
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <div style={{ fontWeight: '600', fontSize: '16px' }}>{inspection.equipment.model}</div>
              <div style={{ fontSize: '13px', color: '#6B7280', marginTop: '4px' }}>{inspection.equipment.serial}</div>
            </div>
            
            <div style={{ marginTop: '16px' }}>
              <div className="progress-bar" style={{ height: '10px' }}>
                <div className="progress-fill" style={{ width: `${progress}%` }}></div>
              </div>
              <div style={{ fontSize: '14px', color: '#6B7280', marginTop: '8px', textAlign: 'center' }}>
                {completedCheckpoints}/{totalCheckpoints} completed
              </div>
            </div>
          </div>

          <div className="section-tabs">
            {inspection.sections.map((s, i) => (
              <button
                key={s.id}
                onClick={() => setCurrentSection(i)}
                className={`tab ${i === currentSection ? 'active' : ''}`}
              >
                <div>
                  <div style={{ fontWeight: '600' }}>{s.code}</div>
                  <div className="tab-full-name">
                    {s.name}
                  </div>
                </div>
              </button>
            ))}
          </div>
          
          <div className="sidebar-complete-button">
            <button
              onClick={handleComplete}
              disabled={completedCheckpoints < totalCheckpoints || isPending}
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '20px' }}
            >
              Complete Inspection ({completedCheckpoints}/{totalCheckpoints})
            </button>
            
            <button
              onClick={handleStopInspection}
              disabled={isPending}
              className="btn btn-danger"
              style={{ 
                width: '100%', 
                marginTop: '12px',
                opacity: 0.8
              }}
              title="Stop inspection and start over"
            >
              Stop Inspection
            </button>
          </div>
        </div>
      </div>

      <div className="inspection-main">
        <div className="container inspection-container">
          <h2 className="section-title">
            {section.name}
          </h2>

          <div className="checkpoints-grid">
            {section.checkpoints.map(checkpoint => {
              const cpData = checkpoints[checkpoint.id]
              return (
                <div key={checkpoint.id} className="checkpoint">
              <div className="checkpoint-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="checkpoint-code">{checkpoint.code}</span>
                  {checkpoint.critical && (
                    <span className="critical-badge">CRITICAL</span>
                  )}
                </div>
                <div className="checkpoint-name">{checkpoint.name}</div>
              </div>

              {cpData.status ? (
                <>
                  <div style={{
                    padding: '12px',
                    borderRadius: '6px',
                    textAlign: 'center',
                    fontWeight: '600',
                    background: cpData.status === 'PASS' ? '#D1FAE5' :
                               cpData.status === 'CORRECTED' ? '#FEF3C7' : '#FEE2E2',
                    color: cpData.status === 'PASS' ? '#065F46' :
                           cpData.status === 'CORRECTED' ? '#92400E' : '#991B1B',
                  }}>
                    {cpData.status.replace('_', ' ')}
                  </div>
                  
                  {/* Show notes if exists */}
                  {cpData.notes && (
                    <div style={{ 
                      marginTop: '12px', 
                      padding: '8px', 
                      background: '#F3F4F6', 
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}>
                      <strong>Notes:</strong> {cpData.notes}
                    </div>
                  )}
                  
                  {/* Show estimated hours if exists */}
                  {cpData.estimatedHours && (
                    <div style={{ 
                      marginTop: '8px', 
                      fontSize: '14px',
                      color: '#6B7280'
                    }}>
                      <strong>Estimated Hours:</strong> {cpData.estimatedHours}
                    </div>
                  )}
                  
                  {/* Show media thumbnails */}
                  {cpData.media && cpData.media.length > 0 && (
                    <div style={{ 
                      marginTop: '12px', 
                      display: 'flex', 
                      gap: '8px',
                      overflowX: 'auto'
                    }}>
                      {cpData.media.map((m: { id: string; type: string }) => (
                        <a 
                          key={m.id} 
                          href={`/api/media/${m.id}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          style={{ flexShrink: 0 }}
                        >
                          {m.type === 'video' ? (
                            <div style={{
                              width: '60px',
                              height: '60px',
                              background: '#3B82F6',
                              borderRadius: '8px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'white',
                              fontSize: '24px'
                            }}>
                              📹
                            </div>
                          ) : (
                            <Image
                              src={`/api/media/${m.id}`}
                              alt="Inspection media"
                              width={60}
                              height={60}
                              style={{
                                objectFit: 'cover',
                                borderRadius: '8px',
                                border: '2px solid #E5E7EB'
                              }}
                            />
                          )}
                        </a>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="action-buttons">
                  <button
                    onClick={() => handleCheckpoint(checkpoint.id, checkpoint.name, 'PASS')}
                    className="btn btn-success"
                    disabled={isPending}
                  >
                    Pass
                  </button>
                  <button
                    onClick={() => handleCheckpoint(checkpoint.id, checkpoint.name, 'CORRECTED')}
                    className="btn btn-warning"
                    disabled={isPending}
                  >
                    Corrected
                  </button>
                  <button
                    onClick={() => handleCheckpoint(checkpoint.id, checkpoint.name, 'ACTION_REQUIRED')}
                    className="btn btn-danger"
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

      <div className="bottom-bar mobile-only">
        <button
          onClick={handleComplete}
          disabled={completedCheckpoints < totalCheckpoints || isPending}
          className="btn btn-primary"
          style={{ width: '100%' }}
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