'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { Icons, iconSizes } from '@/lib/icons'

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
      <div className="modal-content p-5">
        <div className="mb-5">
          <h2 className="text-xl font-semibold mb-2">
            {status === 'CORRECTED' ? 'Mark as Corrected' : 'Action Required'}
          </h2>
          <p className="text-sm text-gray-500">{checkpointName}</p>
        </div>

        {/* Media capture buttons */}
        <div className="mb-5">
          <p className="text-sm font-semibold mb-3">
            Add Photos/Videos
          </p>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              className="btn btn-secondary text-sm py-3 flex items-center justify-center gap-2"
            >
              <Icons.camera className={iconSizes.sm} />
              <span>Take Photo</span>
            </button>
            <button
              type="button"
              onClick={() => videoInputRef.current?.click()}
              className="btn btn-secondary text-sm py-3 flex items-center justify-center gap-2"
            >
              <Icons.video className={iconSizes.sm} />
              <span>Take Video</span>
            </button>
            <button
              type="button"
              onClick={() => uploadPhotoRef.current?.click()}
              className="btn btn-secondary text-sm py-3 flex items-center justify-center gap-2"
            >
              <Icons.upload className={iconSizes.sm} />
              <span>Upload Photo</span>
            </button>
            <button
              type="button"
              onClick={() => uploadVideoRef.current?.click()}
              className="btn btn-secondary text-sm py-3 flex items-center justify-center gap-2"
            >
              <Icons.upload className={iconSizes.sm} />
              <span>Upload Video</span>
            </button>
          </div>

          {/* Hidden file inputs */}
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => handleMediaCapture(e.target.files, 'photo')}
          />
          <input
            ref={videoInputRef}
            type="file"
            accept="video/*"
            capture="environment"
            className="hidden"
            onChange={(e) => handleMediaCapture(e.target.files, 'video')}
          />
          <input
            ref={uploadPhotoRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleMediaCapture(e.target.files, 'photo')}
          />
          <input
            ref={uploadVideoRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(e) => handleMediaCapture(e.target.files, 'video')}
          />

          {/* Media previews */}
          {mediaPreviews.length > 0 && (
            <div className="flex gap-2 overflow-x-auto mt-3">
              {mediaPreviews.map((preview, index) => (
                <div key={index} className="relative flex-shrink-0">
                  {mediaFiles[index].type.startsWith('video') ? (
                    <video
                      src={preview}
                      className="w-20 h-20 object-cover rounded-lg"
                    />
                  ) : (
                    <Image
                      src={preview}
                      alt="Preview"
                      width={80}
                      height={80}
                      className="object-cover rounded-lg"
                    />
                  )}
                  <button
                    onClick={() => removeMedia(index)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 text-xs flex items-center justify-center hover:bg-red-600"
                  >
                    <Icons.close className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Notes field */}
        <div className="mb-5">
          <label className="block text-sm font-semibold mb-2">
            {status === 'CORRECTED' ? 'What was corrected?' : 'What needs to be done?'}
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            className="form-textarea"
            placeholder={status === 'CORRECTED' 
              ? 'Describe what was corrected...' 
              : 'Describe the problem and solution needed...'}
          />
        </div>

        {/* Hours estimate (Action Required only) */}
        {status === 'ACTION_REQUIRED' && (
          <div className="mb-5">
            <label className="block text-sm font-semibold mb-2">
              Estimated Hours to Fix
            </label>
            <input
              type="number"
              value={estimatedHours}
              onChange={(e) => setEstimatedHours(e.target.value)}
              step="0.5"
              min="0"
              className="form-input"
              placeholder="Enter hours (e.g., 2.5)"
            />
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="btn btn-secondary flex-1"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className={`btn ${status === 'CORRECTED' ? 'btn-warning' : 'btn-danger'} flex-1`}
            disabled={!notes.trim()}
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  )
}