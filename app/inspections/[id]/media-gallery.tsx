'use client'

import { useState } from 'react'
import Image from 'next/image'
import Lightbox from '@/app/inspect/[id]/lightbox'
import { Icons } from '@/lib/icons'

interface MediaItem {
  id: string
  type: 'image' | 'video'
}

export default function MediaGallery({ media }: { media: MediaItem[] }) {
  const [isOpen, setIsOpen] = useState(false)
  const [initialIndex, setInitialIndex] = useState(0)

  if (!media || media.length === 0) return null

  return (
    <>
      <div className="flex gap-2 overflow-x-auto">
        {media.map((item, index) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              setInitialIndex(index)
              setIsOpen(true)
            }}
            className="flex-shrink-0 block cursor-pointer hover:opacity-90 transition-opacity"
            title={item.type === 'video' ? 'Open video' : 'Open image'}
          >
            {item.type === 'video' ? (
              <div className="w-16 h-16 bg-blue-500 rounded-lg flex items-center justify-center text-white">
                <Icons.video className="w-6 h-6" />
              </div>
            ) : (
              <Image
                src={`/api/media/${item.id}`}
                alt="Checkpoint media"
                width={64}
                height={64}
                className="w-16 h-16 object-cover rounded-lg border border-gray-300"
              />
            )}
          </button>
        ))}
      </div>

      <Lightbox
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        media={media}
        initialIndex={initialIndex}
      />
    </>
  )
}


