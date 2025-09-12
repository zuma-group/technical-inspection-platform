import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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
        filename: true
      }
    })

    if (!media) {
      return NextResponse.json(
        { error: 'Media not found' },
        { status: 404 }
      )
    }

    // Convert base64 to buffer
    const buffer = Buffer.from(media.data, 'base64')

    // Return media with appropriate headers
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

    // Delete media from database
    await prisma.media.delete({
      where: { id: mediaId }
    })

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