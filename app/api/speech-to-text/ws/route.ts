import { NextRequest, NextResponse } from 'next/server'
import { AssemblyAI } from 'assemblyai'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const apiKey = process.env.ASSEMBLYAI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'AssemblyAI API key not configured' }, { status: 500 })
  }

  try {
    const body = await req.json()
    const { audio } = body

    if (!audio) {
      return NextResponse.json({ error: 'No audio data provided' }, { status: 400 })
    }

    // Initialize AssemblyAI client
    const client = new AssemblyAI({
      apiKey: apiKey
    })

    // Convert base64 audio to buffer
    const audioBuffer = Buffer.from(audio, 'base64')

    // Create a temporary transcript request
    const transcript = await client.transcripts.transcribe({
      audio: audioBuffer,
      speech_model: 'nano'  // Use the fastest model for real-time feel
    })

    if (transcript.status === 'error') {
      return NextResponse.json({ error: transcript.error }, { status: 500 })
    }

    return NextResponse.json({
      text: transcript.text || '',
      confidence: transcript.confidence || 0
    })

  } catch (error) {
    console.error('Transcription error:', error)
    return NextResponse.json({
      error: `Transcription failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const apiKey = process.env.ASSEMBLYAI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'AssemblyAI API key not configured' }, { status: 500 })
  }

  // Return API configuration for client-side use
  return NextResponse.json({
    available: true,
    supportsStreaming: false,
    message: 'AssemblyAI speech-to-text available via batch processing'
  })
}
