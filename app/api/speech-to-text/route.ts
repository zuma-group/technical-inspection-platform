import { NextRequest, NextResponse } from 'next/server'

let speechClient: any

async function getSpeechClient() {
  if (speechClient) return speechClient
  try {
    // Lazy import to avoid bundling in edge environments
    const { SpeechClient } = await import('@google-cloud/speech')

    // Prefer explicit JSON creds if provided
    const raw = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
    if (raw) {
      let credentials: any
      try {
        // Case 1: Inline JSON
        if (raw.trim().startsWith('{')) {
          credentials = JSON.parse(raw)
        } else if (raw.includes('/') || raw.startsWith('.') || raw.match(/^[A-Za-z]:\\/)) {
          // Case 2: File path
          const fs = await import('node:fs/promises')
          const content = await fs.readFile(raw, 'utf8')
          credentials = JSON.parse(content)
        } else {
          // Case 3: Base64-encoded JSON
          const decoded = Buffer.from(raw, 'base64').toString('utf8')
          credentials = JSON.parse(decoded)
        }
      } catch (e) {
        console.error('Invalid GOOGLE_APPLICATION_CREDENTIALS_JSON value')
        throw e
      }
      const projectId = process.env.GOOGLE_CLOUD_PROJECT || credentials.project_id
      speechClient = new SpeechClient({
        credentials,
        projectId,
      } as any)
    } else {
      // Falls back to ADC (GOOGLE_APPLICATION_CREDENTIALS path or metadata)
      speechClient = new SpeechClient()
    }
    return speechClient
  } catch (e) {
    console.error('Failed to initialize Google Speech client:', e)
    throw e
  }
}

function detectEncoding(mimeType?: string | null) {
  if (!mimeType) return 'ENCODING_UNSPECIFIED'
  const mt = mimeType.toLowerCase()
  if (mt.includes('webm')) return 'WEBM_OPUS'
  if (mt.includes('ogg')) return 'OGG_OPUS'
  if (mt.includes('wav') || mt.includes('x-wav')) return 'LINEAR16'
  if (mt.includes('flac')) return 'FLAC'
  return 'ENCODING_UNSPECIFIED'
}

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || ''

    let audioBuffer: Buffer | null = null
    let mimeType: string | null = null
    let languageCode = 'en-US'

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      const file = formData.get('audio') as File | null
      const lang = (formData.get('languageCode') as string | null) || undefined
      const mt = (formData.get('mimeType') as string | null) || undefined
      if (lang) languageCode = lang
      if (!file) {
        return NextResponse.json({ error: 'Missing audio file' }, { status: 400 })
      }
      mimeType = mt || file.type || null
      const arr = await file.arrayBuffer()
      audioBuffer = Buffer.from(arr)
    } else {
      // Assume raw body; mimeType via header
      const arr = await request.arrayBuffer()
      audioBuffer = Buffer.from(arr)
      mimeType = request.headers.get('x-audio-mime') || request.headers.get('content-type')
    }

    if (!audioBuffer || audioBuffer.length === 0) {
      return NextResponse.json({ error: 'Empty audio' }, { status: 400 })
    }

    const encoding = detectEncoding(mimeType)
    const audioContent = audioBuffer.toString('base64')

    const client = await getSpeechClient()
    const [response] = await client.recognize({
      audio: { content: audioContent },
      config: {
        encoding,
        languageCode,
        enableAutomaticPunctuation: true,
        enableWordTimeOffsets: false,
        model: 'latest_long',
      },
    })

    const transcript = (response?.results || [])
      .flatMap((r: any) => r.alternatives || [])
      .map((a: any) => a.transcript)
      .join(' ')
      .trim()

    return NextResponse.json({ transcript })
  } catch (error) {
    console.error('Speech-to-text error:', error)
    return NextResponse.json({ error: 'Failed to transcribe audio' }, { status: 500 })
  }
}


