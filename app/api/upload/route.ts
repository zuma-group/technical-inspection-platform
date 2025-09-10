import { NextRequest, NextResponse } from 'next/server'
import { writeFile } from 'fs/promises'
import path from 'path'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const checkpointId = formData.get('checkpointId') as string
    const files = formData.getAll('files') as File[]
    
    const uploadedMedia = []
    
    for (const file of files) {
      // Generate unique filename
      const timestamp = Date.now()
      const random = Math.random().toString(36).substring(7)
      const extension = file.name.split('.').pop()
      const filename = `${timestamp}-${random}.${extension}`
      
      // Convert file to buffer
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)
      
      // Save file to public/uploads
      const uploadPath = path.join(process.cwd(), 'public', 'uploads', filename)
      await writeFile(uploadPath, buffer)
      
      // Determine media type
      const type = file.type.startsWith('video') ? 'video' : 'photo'
      
      // Save to database
      const media = await prisma.media.create({
        data: {
          checkpointId,
          type,
          url: `/uploads/${filename}`,
          filename: file.name,
        }
      })
      
      uploadedMedia.push(media)
    }
    
    return NextResponse.json({ media: uploadedMedia })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Failed to upload files' },
      { status: 500 }
    )
  }
}