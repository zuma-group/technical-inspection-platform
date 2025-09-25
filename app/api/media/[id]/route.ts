import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { deleteObjectByKey } from '@/lib/s3'
import { getPresignedGetUrl } from '@/lib/s3'
import { buildSignedMediaUrl } from '@/lib/cdn'

export const dynamic = 'force-dynamic'

// Cache media for 1 hour
const CACHE_DURATION = 3600

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: mediaId } = await params

    if (!mediaId) {
      return NextResponse.json(
        { error: 'Media ID is required' },
        { status: 400 }
      )
    }

    // Fetch media from database
    const media = await prisma.media.findUnique({
      where: { id: mediaId },
      select: {
        data: true,
        mimeType: true,
        filename: true,
        storage: true,
        url: true,
        s3Key: true
      }
    })

    if (!media) {
      return NextResponse.json(
        { error: 'Media not found' },
        { status: 404 }
      )
    }

    // If stored in S3, redirect to signed URL (or public URL if desired)
    if (media.storage === 'S3' && media.s3Key) {
      const signedUrl = await buildSignedMediaUrl(media.s3Key, 300)
      return NextResponse.redirect(signedUrl, 302)
    }

    // Otherwise, serve from DB
    const buffer = Buffer.from(media.data || '', 'base64')
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': media.mimeType,
        'Content-Length': buffer.length.toString(),
        'Content-Disposition': `inline; filename="${media.filename}"`,
        'Cache-Control': `public, max-age=${CACHE_DURATION}`,
      },
    })
  } catch (error) {
    console.error('Media fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch media' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: mediaId } = await params

    if (!mediaId) {
      return NextResponse.json(
        { error: 'Media ID is required' },
        { status: 400 }
      )
    }

    // Fetch to know if stored in S3
    const media = await prisma.media.findUnique({
      where: { id: mediaId },
      select: { s3Key: true, storage: true }
    })

    if (!media) {
      return NextResponse.json(
        { error: 'Media not found' },
        { status: 404 }
      )
    }

    // Best-effort delete from S3
    if (media.storage === 'S3' && media.s3Key) {
      try { await deleteObjectByKey(media.s3Key) } catch (e) { console.warn('S3 delete failed', e) }
    }

    // Delete record from database
    await prisma.media.delete({ where: { id: mediaId } })

    return NextResponse.json(
      { success: true, message: 'Media deleted successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Media delete error:', error)
    return NextResponse.json(
      { error: 'Failed to delete media' },
      { status: 500 }
    )
  }
}