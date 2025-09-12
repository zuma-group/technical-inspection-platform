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
    removedMediaIds?: string[]
  }) => void
  status: 'CORRECTED' | 'ACTION_REQUIRED' | 'PASS' | 'NOT_APPLICABLE'
  checkpointName: string
  isEditMode?: boolean
  existingData?: {
    status: string
    notes?: string
    estimatedHours?: number
    media?: Array<{ id: string; type: string }>
  }
}

export default function CheckpointModal({ 
  isOpen, 
  onClose, 
  onSubmit, 
  status, 
  checkpointName,
  isEditMode = false,
  existingData
}: ModalProps) {
  const [currentStatus, setCurrentStatus] = useState(existingData?.status || status)
  const [notes, setNotes] = useState(existingData?.notes || '')
  const [estimatedHours, setEstimatedHours] = useState(existingData?.estimatedHours?.toString() || '')
  const [mediaFiles, setMediaFiles] = useState<File[]>([])
  const [mediaPreviews, setMediaPreviews] = useState<string[]>([])
  const [existingMedia, setExistingMedia] = useState(existingData?.media || [])
  const [removedMediaIds, setRemovedMediaIds] = useState<string[]>([])
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

  const removeExistingMedia = (mediaId: string) => {
    setExistingMedia(prev => prev.filter(m => m.id !== mediaId))
    setRemovedMediaIds(prev => [...prev, mediaId])
  }

  const handleSubmit = () => {
    const data = {
      status: currentStatus,
      notes,
      estimatedHours: estimatedHours ? parseFloat(estimatedHours) : undefined,
      media: mediaFiles,
      removedMediaIds: removedMediaIds.length > 0 ? removedMediaIds : undefined
    }
    onSubmit(data)
    
    // Reset form
    setNotes('')
    setEstimatedHours('')
    setMediaFiles([])
    setMediaPreviews([])
    setExistingMedia([])
    setRemovedMediaIds([])
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content p-5">
        <div className="mb-5">
          <h2 className="text-xl font-semibold mb-2">
            {isEditMode ? 'Edit Checkpoint' : 
             currentStatus === 'CORRECTED' ? 'Mark as Corrected' : 
             currentStatus === 'ACTION_REQUIRED' ? 'Action Required' :
             currentStatus === 'PASS' ? 'Mark as Passed' : 'Mark as N/A'}
          </h2>
          <p className="text-sm text-gray-500">{checkpointName}</p>
        </div>

        {/* Status selector for edit mode */}
        {isEditMode && (
          <div className="mb-5">
            <label className="block text-sm font-semibold mb-2">Status</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setCurrentStatus('PASS')}
                className={`py-3 px-4 rounded-lg font-semibold transition-all ${
                  currentStatus === 'PASS' 
                    ? 'bg-green-500 text-white border-2 border-green-600' 
                    : 'bg-gray-100 text-gray-700 border-2 border-gray-300 hover:bg-gray-200'
                }`}
              >
                PASS
              </button>
              <button
                type="button"
                onClick={() => setCurrentStatus('CORRECTED')}
                className={`py-3 px-4 rounded-lg font-semibold transition-all ${
                  currentStatus === 'CORRECTED' 
                    ? 'bg-yellow-500 text-white border-2 border-yellow-600' 
                    : 'bg-gray-100 text-gray-700 border-2 border-gray-300 hover:bg-gray-200'
                }`}
              >
                CORRECTED
              </button>
              <button
                type="button"
                onClick={() => setCurrentStatus('ACTION_REQUIRED')}
                className={`py-3 px-4 rounded-lg font-semibold transition-all ${
                  currentStatus === 'ACTION_REQUIRED' 
                    ? 'bg-red-500 text-white border-2 border-red-600' 
                    : 'bg-gray-100 text-gray-700 border-2 border-gray-300 hover:bg-gray-200'
                }`}
              >
                ACTION
              </button>
              <button
                type="button"
                onClick={() => setCurrentStatus('NOT_APPLICABLE')}
                className={`py-3 px-4 rounded-lg font-semibold transition-all ${
                  currentStatus === 'NOT_APPLICABLE' 
                    ? 'bg-gray-500 text-white border-2 border-gray-600' 
                    : 'bg-gray-100 text-gray-700 border-2 border-gray-300 hover:bg-gray-200'
                }`}
              >
                N/A
              </button>
            </div>
          </div>
        )}

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

          {/* Existing media - only in edit mode */}
          {isEditMode && existingMedia.length > 0 && (
            <div className="mt-3 pb-2">
              <p className="text-xs text-gray-600 mb-2">Existing media:</p>
              <div className="flex gap-3 overflow-x-auto pb-2 pt-2">
                {existingMedia.map((media) => (
                  <div key={media.id} className="relative flex-shrink-0 mr-2">
                    {media.type === 'video' ? (
                      <div className="w-20 h-20 bg-blue-500 rounded-lg flex items-center justify-center text-white">
                        <Icons.video className="w-8 h-8" />
                      </div>
                    ) : (
                      <Image
                        src={`/api/media/${media.id}`}
                        alt="Existing media"
                        width={80}
                        height={80}
                        className="w-20 h-20 object-cover rounded-lg border-2 border-gray-300"
                      />
                    )}
                    <button
                      onClick={() => removeExistingMedia(media.id)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 text-xs flex items-center justify-center hover:bg-red-600 z-10"
                      title="Remove media"
                    >
                      <Icons.close className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* New media previews */}
          {mediaPreviews.length > 0 && (
            <div className="mt-3 pb-2">
              {isEditMode && <p className="text-xs text-gray-600 mb-2">New media:</p>}
              <div className="flex gap-3 overflow-x-auto pb-2 pt-2">
              {mediaPreviews.map((preview, index) => (
                <div key={index} className="relative flex-shrink-0 mr-2">
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
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 text-xs flex items-center justify-center hover:bg-red-600 z-10"
                  >
                    <Icons.close className="w-3 h-3" />
                  </button>
                </div>
              ))}
              </div>
            </div>
          )}
        </div>

        {/* Notes field - show for CORRECTED and ACTION_REQUIRED */}
        {(currentStatus === 'CORRECTED' || currentStatus === 'ACTION_REQUIRED') && (
        <div className="mb-5">
          <label className="block text-sm font-semibold mb-2">
            {currentStatus === 'CORRECTED' ? 'What was corrected?' : 'What needs to be done?'}
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            className="form-textarea"
            placeholder={currentStatus === 'CORRECTED' 
              ? 'Describe what was corrected...' 
              : 'Describe the problem and solution needed...'}
          />
        </div>
        )}

        {/* Hours estimate (Action Required only) */}
        {currentStatus === 'ACTION_REQUIRED' && (
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
            className={`btn ${currentStatus === 'PASS' ? 'btn-success' : currentStatus === 'CORRECTED' ? 'btn-warning' : currentStatus === 'ACTION_REQUIRED' ? 'btn-danger' : 'btn-secondary'} flex-1`}
            disabled={(currentStatus === 'CORRECTED' || currentStatus === 'ACTION_REQUIRED') && !notes.trim()}
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  )
}