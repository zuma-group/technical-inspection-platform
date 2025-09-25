import { NextRequest, NextResponse } from 'next/server'
import { createUploadPresignedPost } from '@/lib/s3'

export const dynamic = 'force-dynamic'

const MAX_VIDEO_SIZE = 200 * 1024 * 1024 // 200MB
const ALLOWED_VIDEO_TYPES = ['video/mp4','video/webm','video/ogg','video/quicktime']

export async function POST(request: NextRequest) {
  try {
    const { checkpointId, filename, contentType } = await request.json()
    if (!checkpointId || !filename || !contentType) {
      return NextResponse.json({ error: 'Missing checkpointId, filename, or contentType' }, { status: 400 })
    }

    if (!ALLOWED_VIDEO_TYPES.includes(contentType)) {
      return NextResponse.json({ error: 'Unsupported video content type' }, { status: 400 })
    }

    // Key layout: media/videos/<checkpointId>/<timestamp>-<sanitizedFilename>
    const sanitized = filename.replace(/[^a-zA-Z0-9._-]/g, '_')
    const key = `media/videos/${checkpointId}/${Date.now()}-${sanitized}`

    const presign = await createUploadPresignedPost({
      key,
      contentType,
      maxSizeBytes: MAX_VIDEO_SIZE,
      expiresSeconds: 300
    })

    return NextResponse.json({
      upload: presign,
      key
    })
  } catch (error) {
    console.error('Presign error:', error)
    return NextResponse.json({ error: 'Failed to create presigned POST' }, { status: 500 })
  }
}


