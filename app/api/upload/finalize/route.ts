import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { publicUrlForKey } from '@/lib/s3'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { checkpointId, key, filename, mimeType, size } = await request.json()
    if (!checkpointId || !key || !filename || !mimeType || !size) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    const checkpoint = await prisma.checkpoint.findUnique({ where: { id: checkpointId } })
    if (!checkpoint) {
      return NextResponse.json({ error: 'Invalid checkpointId' }, { status: 404 })
    }

    const type = mimeType.startsWith('video') ? 'video' : 'photo'
    const url = publicUrlForKey(key)

    const media = await prisma.media.create({
      data: {
        checkpointId,
        type,
        data: null,
        filename,
        mimeType,
        size: Number(size),
        storage: 'S3',
        url,
        s3Key: key
      } as any,
      select: {
        id: true,
        type: true,
        filename: true,
        mimeType: true,
        size: true,
        createdAt: true,
        url: true
      }
    })

    return NextResponse.json({ success: true, media })
  } catch (error) {
    console.error('Finalize upload error:', error)
    return NextResponse.json({ error: 'Failed to finalize upload' }, { status: 500 })
  }
}


