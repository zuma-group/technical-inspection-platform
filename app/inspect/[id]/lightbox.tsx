'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Icons } from '@/lib/icons'

interface LightboxProps {
  isOpen: boolean
  onClose: () => void
  media: Array<{ id: string; type: string; dataUrl?: string }>
  initialIndex?: number
}

export default function Lightbox({ isOpen, onClose, media, initialIndex = 0 }: LightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)

  useEffect(() => {
    setCurrentIndex(initialIndex)
  }, [initialIndex])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return
      
      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === 'ArrowLeft') {
        goToPrevious()
      } else if (e.key === 'ArrowRight') {
        goToNext()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, currentIndex])

  if (!isOpen || !media || media.length === 0) return null

  const currentMedia = media[currentIndex]

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + media.length) % media.length)
  }

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % media.length)
  }

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      <div className="relative w-full h-full flex items-center justify-center p-4">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors z-10"
          aria-label="Close lightbox"
        >
          <Icons.close className="w-8 h-8" />
        </button>

        {/* Previous button */}
        {media.length > 1 && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              goToPrevious()
            }}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 transition-colors z-10 bg-black bg-opacity-50 rounded-full p-2"
            aria-label="Previous image"
          >
            <Icons.back className="w-6 h-6" />
          </button>
        )}

        {/* Media display */}
        <div 
          className="max-w-full max-h-full flex items-center justify-center"
          onClick={(e) => e.stopPropagation()}
        >
          {currentMedia.type === 'video' ? (
            <video
              src={currentMedia.dataUrl || `/api/media/${currentMedia.id}`}
              controls
              autoPlay
              className="max-w-full max-h-[90vh] rounded-lg"
            />
          ) : (
            <img
              src={currentMedia.dataUrl || `/api/media/${currentMedia.id}`}
              alt="Inspection media"
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
            />
          )}
        </div>

        {/* Next button */}
        {media.length > 1 && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              goToNext()
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 transition-colors z-10 bg-black bg-opacity-50 rounded-full p-2"
            aria-label="Next image"
          >
            <Icons.chevronRight className="w-6 h-6" />
          </button>
        )}

        {/* Image counter */}
        {media.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white bg-black bg-opacity-50 px-3 py-1 rounded-full">
            {currentIndex + 1} / {media.length}
          </div>
        )}
      </div>
    </div>
  )
}