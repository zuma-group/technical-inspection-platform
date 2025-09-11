import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// Maximum file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024

// Allowed MIME types for security
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'video/mp4',
  'video/webm',
  'video/ogg',
  'video/quicktime'
]

// Sanitize filename to prevent path traversal
function sanitizeFilename(filename: string): string {
  // Remove any directory components and special characters
  return filename
    .replace(/^.*[\\\/]/, '') // Remove path
    .replace(/[^a-zA-Z0-9.-]/g, '_') // Replace special chars with underscore
    .substring(0, 255) // Limit length
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const checkpointId = formData.get('checkpointId') as string
    const files = formData.getAll('files') as File[]
    
    // Validate checkpoint exists
    if (!checkpointId) {
      return NextResponse.json(
        { error: 'Checkpoint ID is required' },
        { status: 400 }
      )
    }

    // Check if checkpoint exists in database
    const checkpoint = await prisma.checkpoint.findUnique({
      where: { id: checkpointId }
    })

    if (!checkpoint) {
      return NextResponse.json(
        { error: 'Invalid checkpoint ID' },
        { status: 404 }
      )
    }

    // Validate files
    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      )
    }

    // Limit number of files per request
    if (files.length > 10) {
      return NextResponse.json(
        { error: 'Maximum 10 files allowed per upload' },
        { status: 400 }
      )
    }
    
    const uploadedMedia = []
    
    for (const file of files) {
      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `File ${file.name} exceeds maximum size of 10MB` },
          { status: 400 }
        )
      }

      // Validate MIME type
      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        return NextResponse.json(
          { error: `File type ${file.type} is not allowed` },
          { status: 400 }
        )
      }

      // Sanitize filename
      const sanitizedFilename = sanitizeFilename(file.name)
      
      // Convert file to base64
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)
      const base64Data = buffer.toString('base64')
      
      // Determine media type
      const type = file.type.startsWith('video') ? 'video' : 'photo'
      
      // Save to database with base64 data
      const media = await prisma.media.create({
        data: {
          checkpointId,
          type,
          data: base64Data,
          filename: sanitizedFilename,
          mimeType: file.type,
          size: file.size
        },
        select: {
          id: true,
          type: true,
          filename: true,
          mimeType: true,
          size: true,
          createdAt: true
          // Don't return the data field in response to keep payload small
        }
      })
      
      uploadedMedia.push(media)
    }
    
    return NextResponse.json({ 
      success: true,
      media: uploadedMedia 
    })
  } catch (error) {
    console.error('Upload error:', error)
    
    // Don't expose internal error details
    return NextResponse.json(
      { error: 'Failed to upload files' },
      { status: 500 }
    )
  }
}