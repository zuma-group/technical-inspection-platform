import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const inspection = await prisma.inspection.findUnique({
      where: { id },
      include: {
        equipment: true,
        technician: { select: { name: true, email: true } },
        sections: {
          orderBy: { order: 'asc' },
          include: {
            checkpoints: { orderBy: { order: 'asc' } }
          }
        }
      }
    })

    if (!inspection) {
      return NextResponse.json({ error: 'Inspection not found' }, { status: 404 })
    }

    // Build a real PDF using pdf-lib
    const pdfDoc = await PDFDocument.create()
    const pageMargin = 50
    const pageWidth = 612
    const pageHeight = 792
    const titleFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
    const bodyFont = await pdfDoc.embedFont(StandardFonts.Helvetica)

    const addPage = () => pdfDoc.addPage([pageWidth, pageHeight])
    let page = addPage()
    let y = pageHeight - pageMargin

    const drawText = (text: string, options?: { size?: number; font?: any; color?: any }) => {
      const size = options?.size ?? 12
      const font = options?.font ?? bodyFont
      const color = options?.color ?? rgb(0, 0, 0)
      const maxWidth = pageWidth - pageMargin * 2
      const words = text.split(' ')
      let line = ''
      const lines: string[] = []
      for (const w of words) {
        const test = line ? line + ' ' + w : w
        const width = font.widthOfTextAtSize(test, size)
        if (width > maxWidth) {
          if (line) lines.push(line)
          line = w
        } else {
          line = test
        }
      }
      if (line) lines.push(line)
      for (const l of lines) {
        if (y - size < pageMargin) {
          page = addPage()
          y = pageHeight - pageMargin
        }
        page.drawText(l, { x: pageMargin, y, size, font, color })
        y -= size + 4
      }
    }

    // Header
    drawText('Inspection Report', { size: 20, font: titleFont })
    y -= 6
    drawText(`Equipment: ${inspection.equipment.model} (${inspection.equipment.serial})`)
    drawText(`Date: ${new Date(inspection.startedAt).toLocaleString()}`)
    drawText(`Status: ${inspection.status.replace(/_/g, ' ')}`)
    drawText(`Technician: ${inspection.technician?.name || 'N/A'}`)
    y -= 8

    for (const section of inspection.sections) {
      y -= 6
      drawText(section.name, { size: 14, font: titleFont })
      for (const cp of section.checkpoints) {
        const status = cp.status ?? 'N/A'
        const critical = cp.critical ? ' (CRITICAL)' : ''
        drawText(`• [${status}] ${cp.name}${critical}`)
        if (cp.notes) drawText(`   Notes: ${cp.notes}`)
      }
    }

    const pdfBytes = await pdfDoc.save()

    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="inspection-${inspection.id}.pdf"`,
        'Content-Length': String(pdfBytes.length)
      }
    })
  } catch (error) {
    console.error('Failed to generate inspection PDF:', error)
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 })
  }
}


