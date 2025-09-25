import { NextRequest, NextResponse } from 'next/server'
import { getInspectionForPDF, generateInspectionPDF } from '@/lib/pdf-generator'
import { generateEmailContent } from '@/lib/email'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // Get the inspection data using shared module
    const inspection = await getInspectionForPDF(id)

    if (!inspection) {
      return NextResponse.json({ error: 'Inspection not found' }, { status: 404 })
    }

    // Generate PDF using shared module
    const pdfBytes = await generateInspectionPDF(inspection)
    
    // Generate filename using shared module
    const emailContent = generateEmailContent(inspection)

    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${emailContent.filename}"`,
        'Content-Length': String(pdfBytes.length)
      }
    })
  } catch (error) {
    console.error('Failed to generate inspection PDF:', error)
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 })
  }
}


