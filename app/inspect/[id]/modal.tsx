'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: {
    status: string
    notes: string
    estimatedHours?: number
    media: File[]
  }) => void
  status: 'CORRECTED' | 'ACTION_REQUIRED'
  checkpointName: string
}

export default function CheckpointModal({ 
  isOpen, 
  onClose, 
  onSubmit, 
  status, 
  checkpointName 
}: ModalProps) {
  const [notes, setNotes] = useState('')
  const [estimatedHours, setEstimatedHours] = useState('')
  const [mediaFiles, setMediaFiles] = useState<File[]>([])
  const [mediaPreviews, setMediaPreviews] = useState<string[]>([])
  const photoInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const uploadPhotoRef = useRef<HTMLInputElement>(null)
  const uploadVideoRef = useRef<HTMLInputElement>(null)

  if (!isOpen) return null

  const handleMediaCapture = (files: FileList | null, _type: 'photo' | 'video') => {
    if (!files || files.length === 0) return
    
    const file = files[0]
    setMediaFiles(prev => [...prev, file])
    
    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => {
      if (e.target?.result) {
        setMediaPreviews(prev => [...prev, e.target.result as string])
      }
    }
    reader.readAsDataURL(file)
  }

  const removeMedia = (index: number) => {
    setMediaFiles(prev => prev.filter((_, i) => i !== index))
    setMediaPreviews(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = () => {
    const data = {
      status,
      notes,
      estimatedHours: estimatedHours ? parseFloat(estimatedHours) : undefined,
      media: mediaFiles
    }
    onSubmit(data)
    
    // Reset form
    setNotes('')
    setEstimatedHours('')
    setMediaFiles([])
    setMediaPreviews([])
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ padding: '20px' }}>
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px' }}>
            {status === 'CORRECTED' ? 'Mark as Corrected' : 'Action Required'}
          </h2>
          <p style={{ fontSize: '14px', color: '#6B7280' }}>{checkpointName}</p>
        </div>

        {/* Media capture buttons */}
        <div style={{ marginBottom: '20px' }}>
          <p style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>
            Add Photos/Videos
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              className="btn btn-secondary"
              style={{ fontSize: '14px', padding: '12px' }}
            >
              📷 Take Photo
            </button>
            <button
              type="button"
              onClick={() => videoInputRef.current?.click()}
              className="btn btn-secondary"
              style={{ fontSize: '14px', padding: '12px' }}
            >
              📹 Take Video
            </button>
            <button
              type="button"
              onClick={() => uploadPhotoRef.current?.click()}
              className="btn btn-secondary"
              style={{ fontSize: '14px', padding: '12px' }}
            >
              📤 Upload Photo
            </button>
            <button
              type="button"
              onClick={() => uploadVideoRef.current?.click()}
              className="btn btn-secondary"
              style={{ fontSize: '14px', padding: '12px' }}
            >
              📤 Upload Video
            </button>
          </div>

          {/* Hidden file inputs */}
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: 'none' }}
            onChange={(e) => handleMediaCapture(e.target.files, 'photo')}
          />
          <input
            ref={videoInputRef}
            type="file"
            accept="video/*"
            capture="environment"
            style={{ display: 'none' }}
            onChange={(e) => handleMediaCapture(e.target.files, 'video')}
          />
          <input
            ref={uploadPhotoRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(e) => handleMediaCapture(e.target.files, 'photo')}
          />
          <input
            ref={uploadVideoRef}
            type="file"
            accept="video/*"
            style={{ display: 'none' }}
            onChange={(e) => handleMediaCapture(e.target.files, 'video')}
          />

          {/* Media previews */}
          {mediaPreviews.length > 0 && (
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', marginTop: '12px' }}>
              {mediaPreviews.map((preview, index) => (
                <div key={index} style={{ position: 'relative', flexShrink: 0 }}>
                  {mediaFiles[index].type.startsWith('video') ? (
                    <video
                      src={preview}
                      style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px' }}
                    />
                  ) : (
                    <Image
                      src={preview}
                      alt="Preview"
                      width={80}
                      height={80}
                      style={{ objectFit: 'cover', borderRadius: '8px' }}
                    />
                  )}
                  <button
                    onClick={() => removeMedia(index)}
                    style={{
                      position: 'absolute',
                      top: '-8px',
                      right: '-8px',
                      background: '#EF4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: '50%',
                      width: '24px',
                      height: '24px',
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Notes field */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
            {status === 'CORRECTED' ? 'What was corrected?' : 'What needs to be done?'}
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #E5E7EB',
              borderRadius: '8px',
              fontSize: '16px',
              resize: 'vertical'
            }}
            placeholder={status === 'CORRECTED' 
              ? 'Describe what was corrected...' 
              : 'Describe the problem and solution needed...'}
          />
        </div>

        {/* Hours estimate (Action Required only) */}
        {status === 'ACTION_REQUIRED' && (
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
              Estimated Hours to Fix
            </label>
            <input
              type="number"
              value={estimatedHours}
              onChange={(e) => setEstimatedHours(e.target.value)}
              step="0.5"
              min="0"
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
                fontSize: '16px'
              }}
              placeholder="Enter hours (e.g., 2.5)"
            />
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={onClose}
            className="btn btn-secondary"
            style={{ flex: 1 }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className={`btn ${status === 'CORRECTED' ? 'btn-warning' : 'btn-danger'}`}
            style={{ flex: 1 }}
            disabled={!notes.trim()}
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  )
}