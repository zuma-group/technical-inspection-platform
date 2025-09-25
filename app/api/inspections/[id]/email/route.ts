import { NextRequest, NextResponse } from 'next/server'
import { sendEmailWithPdf, generateEmailContent } from '@/lib/email'
import { getInspectionForPDF, generateInspectionPDF } from '@/lib/pdf-generator'

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email address is required' }, { status: 400 })
    }

    // Get the inspection data using shared module
    const inspection = await getInspectionForPDF(id)

    if (!inspection) {
      return NextResponse.json({ error: 'Inspection not found' }, { status: 404 })
    }

    // Generate PDF using shared module
    const pdfBytes = await generateInspectionPDF(inspection)
    
    // Generate email content using shared module
    const emailContent = generateEmailContent(inspection)

    // Send email with PDF attachment
    const emailResult = await sendEmailWithPdf({
      to: email,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
      pdf: { 
        filename: emailContent.filename, 
        content: Buffer.from(pdfBytes) 
      }
    })

    console.log('📧 Inspection report email sent', {
      to: email,
      messageId: (emailResult as any)?.messageId || 'n/a'
    })

    return NextResponse.json({ 
      success: true, 
      message: 'Inspection report sent successfully',
      messageId: (emailResult as any)?.messageId
    })

  } catch (error) {
    console.error('Failed to send inspection report email:', error)
    return NextResponse.json({ 
      error: 'Failed to send email', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
