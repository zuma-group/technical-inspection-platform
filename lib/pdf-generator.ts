import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { prisma } from '@/lib/prisma'

// Use a more flexible type that matches what Prisma actually returns
export type InspectionData = NonNullable<Awaited<ReturnType<typeof getInspectionForPDF>>>

export async function getInspectionForPDF(inspectionId: string) {
  try {
    return await prisma.inspection.findUnique({
      where: { id: inspectionId },
      include: {
        equipment: true,
        technician: { select: { name: true, email: true } },
        sections: {
          orderBy: { order: 'asc' },
          include: {
            checkpoints: { 
              orderBy: { order: 'asc' },
              include: { media: true }
            }
          }
        }
      }
    })
  } catch (error) {
    console.error('Failed to fetch inspection for PDF:', error)
    return null
  }
}

export async function generateInspectionPDF(inspection: InspectionData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create()
  const pageMargin = 60
  const pageWidth = 612
  const pageHeight = 792
  const contentWidth = pageWidth - (pageMargin * 2)
  
  // Get the site URL for full media URLs
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || 'http://localhost:3000'
  
  // Load fonts
  const titleFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const bodyFont = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const italicFont = await pdfDoc.embedFont(StandardFonts.HelveticaOblique)
  
  // Color scheme
  const primaryColor = rgb(0.11, 0.42, 0.47) // Teal-600
  const secondaryColor = rgb(0.37, 0.37, 0.37) // Gray-600
  const lightGrayColor = rgb(0.96, 0.96, 0.96) // Gray-100
  const successColor = rgb(0.05, 0.46, 0.22) // Green-700
  const warningColor = rgb(0.92, 0.40, 0.11) // Orange-600
  const dangerColor = rgb(0.73, 0.06, 0.20) // Red-700
  
  const addPage = () => pdfDoc.addPage([pageWidth, pageHeight])
  let page = addPage()
  let y = pageHeight - pageMargin

  // Enhanced text drawing with better spacing and alignment options
  const drawText = (text: string, options?: { 
    size?: number; 
    font?: any; 
    color?: any; 
    align?: 'left' | 'center' | 'right';
    lineHeight?: number;
    indent?: number;
  }) => {
    const size = options?.size ?? 12
    const font = options?.font ?? bodyFont
    const color = options?.color ?? rgb(0, 0, 0)
    const align = options?.align ?? 'left'
    const lineHeight = options?.lineHeight ?? 1.3
    const indent = options?.indent ?? 0
    const maxWidth = contentWidth - indent
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
      if (y - (size * lineHeight) < pageMargin) {
        page = addPage()
        y = pageHeight - pageMargin
      }
      
      let x = pageMargin + indent
      if (align === 'center') {
        const textWidth = font.widthOfTextAtSize(l, size)
        x = (pageWidth - textWidth) / 2
      } else if (align === 'right') {
        const textWidth = font.widthOfTextAtSize(l, size)
        x = pageWidth - pageMargin - textWidth
      }
      
      page.drawText(l, { x, y, size, font, color })
      y -= size * lineHeight
    }
  }

  // Draw a horizontal line (separator)
  const drawLine = (width?: number, color?: any, thickness?: number) => {
    const lineWidth = width ?? contentWidth
    const lineColor = color ?? lightGrayColor
    const lineThickness = thickness ?? 1
    
    if (y - 10 < pageMargin) {
      page = addPage()
      y = pageHeight - pageMargin
    }
    
    page.drawRectangle({
      x: pageMargin,
      y: y - 5,
      width: lineWidth,
      height: lineThickness,
      color: lineColor
    })
    y -= 15
  }

  // Draw a colored background box
  const drawBox = (height: number, color?: any, padding?: number) => {
    const boxColor = color ?? lightGrayColor
    const boxPadding = padding ?? 10
    
    if (y - height < pageMargin) {
      page = addPage()
      y = pageHeight - pageMargin
    }
    
    page.drawRectangle({
      x: pageMargin - boxPadding,
      y: y - height,
      width: contentWidth + (boxPadding * 2),
      height: height,
      color: boxColor
    })
  }

  // Draw section header with background
  const drawSectionHeader = (title: string, bgColor?: any) => {
    const headerHeight = 30
    const backgroundColor = bgColor ?? primaryColor
    
    if (y - headerHeight < pageMargin) {
      page = addPage()
      y = pageHeight - pageMargin
    }
    
    // Draw background rectangle
    page.drawRectangle({
      x: pageMargin - 5,
      y: y - headerHeight + 5,
      width: contentWidth + 10,
      height: headerHeight,
      color: backgroundColor
    })
    
    // Draw text
    const textY = y - 18
    page.drawText(title, {
      x: pageMargin + 10,
      y: textY,
      size: 14,
      font: titleFont,
      color: rgb(1, 1, 1) // White text
    })
    
    y -= headerHeight + 5
  }

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'PASS': return successColor
      case 'CORRECTED': return warningColor
      case 'ACTION_REQUIRED': return dangerColor
      default: return secondaryColor
    }
  }

  const drawImage = async (media: any, maxWidth?: number) => {
    try {
      if (media.type === 'video') {
        // For videos, show URL since PDFs can't embed videos
        const videoUrl = `${siteUrl}/api/media/${media.id}`
        drawText(`Video: ${media.filename}`, { 
          font: bodyFont, 
          size: 10,
          color: secondaryColor, 
          indent: 20 
        })
        drawText(`View at: ${videoUrl}`, { 
          font: italicFont, 
          size: 9,
          color: primaryColor, 
          indent: 20 
        })
        y -= 5 // Extra spacing after URL
        return
      }

      // Decode base64 image data and validate
      let imageData: Buffer
      let image
      
      try {
        imageData = Buffer.from(media.data, 'base64')
        
        // Basic validation - check if buffer has reasonable size
        if (imageData.length < 100) {
          throw new Error('Image data too small - likely corrupted')
        }
        
        // Try to embed the image based on mime type
        if (media.mimeType.includes('jpeg') || media.mimeType.includes('jpg')) {
          // Validate JPEG header (should start with FF D8)
          if (imageData[0] !== 0xFF || imageData[1] !== 0xD8) {
            throw new Error('Invalid JPEG header - data may be corrupted')
          }
          image = await pdfDoc.embedJpg(imageData)
        } else if (media.mimeType.includes('png')) {
          // Validate PNG header (should start with 89 50 4E 47)
          if (imageData[0] !== 0x89 || imageData[1] !== 0x50 || 
              imageData[2] !== 0x4E || imageData[3] !== 0x47) {
            throw new Error('Invalid PNG header - data may be corrupted')
          }
          image = await pdfDoc.embedPng(imageData)
        } else {
          // Unsupported format, show URL instead
          const imageUrl = `${siteUrl}/api/media/${media.id}`
          drawText(`File (unsupported in PDF): ${media.filename}`, { 
            font: bodyFont, 
            size: 10,
            color: secondaryColor, 
            indent: 20 
          })
          drawText(`View at: ${imageUrl}`, { 
            font: italicFont, 
            size: 9,
            color: primaryColor, 
            indent: 20 
          })
          y -= 5 // Extra spacing after URL
          return
        }
      } catch (validationError) {
        // Image validation or embedding failed - show URL instead
        console.warn(`Skipping corrupted image ${media.filename}:`, validationError)
        const imageUrl = `${siteUrl}/api/media/${media.id}`
        drawText(`Image (corrupted in PDF): ${media.filename}`, { 
          font: bodyFont, 
          size: 10,
          color: secondaryColor, 
          indent: 20 
        })
        drawText(`View at: ${imageUrl}`, { 
          font: italicFont, 
          size: 9,
          color: primaryColor, 
          indent: 20 
        })
        y -= 5 // Extra spacing after URL
        return
      }

      const imageMaxSize = maxWidth ?? 200 // Max width/height
      const { width: origWidth, height: origHeight } = image
      const aspectRatio = origWidth / origHeight
      
      let drawWidth = imageMaxSize
      let drawHeight = imageMaxSize / aspectRatio
      
      if (drawHeight > imageMaxSize) {
        drawHeight = imageMaxSize
        drawWidth = imageMaxSize * aspectRatio
      }

      // Check if we need a new page
      if (y - drawHeight - 20 < pageMargin) {
        page = addPage()
        y = pageHeight - pageMargin
      }

      // Draw a subtle border around the image
      page.drawRectangle({
        x: pageMargin + 18,
        y: y - drawHeight - 2,
        width: drawWidth + 4,
        height: drawHeight + 4,
        borderColor: lightGrayColor,
        borderWidth: 1
      })

      page.drawImage(image, {
        x: pageMargin + 20,
        y: y - drawHeight,
        width: drawWidth,
        height: drawHeight
      })
      
      y -= drawHeight + 15
    } catch (error) {
      // This should only catch unexpected errors during drawing/sizing
      console.error('Unexpected error during image rendering:', error)
      const imageUrl = `${siteUrl}/api/media/${media.id}`
      drawText(`Image (render error): ${media.filename}`, { 
        font: bodyFont, 
        size: 10,
        color: dangerColor, 
        indent: 20 
      })
      drawText(`View at: ${imageUrl}`, { 
        font: italicFont, 
        size: 9,
        color: primaryColor, 
        indent: 20 
      })
      y -= 5 // Extra spacing after URL
    }
  }

  // HEADER SECTION WITH TITLE
  drawText('TECHNICAL INSPECTION REPORT', { 
    size: 24, 
    font: titleFont, 
    color: primaryColor, 
    align: 'center' 
  })
  y -= 10
  drawLine(contentWidth, primaryColor, 2)
  y -= 20

  // INSPECTION OVERVIEW SECTION
  drawSectionHeader('Inspection Overview')
  
  // Equipment info in a clean table-like format
  const overviewData = [
    ['Equipment Model:', inspection.equipment.model],
    ['Serial Number:', inspection.equipment.serial],
    ['Inspection Date:', new Date(inspection.startedAt).toLocaleString()],
    ['Current Status:', inspection.status.replace(/_/g, ' ').toUpperCase()],
    ['Technician:', inspection.technician?.name || 'Not Assigned'],
  ]

  for (const [label, value] of overviewData) {
    const currentY = y
    drawText(label, { 
      font: titleFont, 
      size: 11, 
      color: secondaryColor 
    })
    page.drawText(value, {
      x: pageMargin + 140,
      y: currentY,
      size: 11,
      font: bodyFont,
      color: rgb(0, 0, 0)
    })
    y -= 18
  }

  y -= 15
  drawLine()

  // INSPECTION SUMMARY
  y -= 15
  drawSectionHeader('Inspection Summary')
  
  // Calculate statistics
  let totalCheckpoints = 0
  let passCount = 0
  let correctedCount = 0
  let actionRequiredCount = 0
  let naCount = 0
  let totalEstimatedHours = 0
  let criticalIssues = 0

  for (const section of inspection.sections) {
    for (const cp of section.checkpoints) {
      totalCheckpoints++
      if (cp.critical && cp.status === 'ACTION_REQUIRED') criticalIssues++
      if (cp.estimatedHours) totalEstimatedHours += cp.estimatedHours
      
      switch (cp.status) {
        case 'PASS': passCount++; break
        case 'CORRECTED': correctedCount++; break
        case 'ACTION_REQUIRED': actionRequiredCount++; break
        case 'NOT_APPLICABLE': naCount++; break
      }
    }
  }

  // Summary stats in columns
  const summaryStats = [
    ['Total Checkpoints:', totalCheckpoints.toString()],
    ['Passed:', passCount.toString()],
    ['Corrected:', correctedCount.toString()],
    ['Action Required:', actionRequiredCount.toString()],
    ['Not Applicable:', naCount.toString()],
    ['Critical Issues:', criticalIssues.toString()],
    ['Est. Hours to Fix:', totalEstimatedHours > 0 ? `${totalEstimatedHours}h` : 'N/A']
  ]

  for (const [label, value] of summaryStats) {
    const currentY = y
    drawText(label, { 
      font: titleFont, 
      size: 11, 
      color: secondaryColor 
    })
    
    // Color code the values
    let valueColor = rgb(0, 0, 0)
    if (label.includes('Critical') && value !== '0') valueColor = dangerColor
    else if (label.includes('Action Required') && value !== '0') valueColor = warningColor
    else if (label.includes('Passed')) valueColor = successColor
    
    page.drawText(value, {
      x: pageMargin + 140,
      y: currentY,
      size: 11,
      font: titleFont,
      color: valueColor
    })
    y -= 18
  }

  y -= 20

  // DETAILED INSPECTION RESULTS
  for (const section of inspection.sections) {
    // New page for each major section if needed
    if (y < pageMargin + 200) {
      page = addPage()
      y = pageHeight - pageMargin
    }

    drawSectionHeader(`${section.name}`)
    
    for (const cp of section.checkpoints) {
      const status = cp.status ?? 'NOT_CHECKED'
      const statusColor = getStatusColor(status)
      const critical = cp.critical ? ' [CRITICAL]' : ''
      
      // Checkpoint header with status badge
      const currentY = y
      
      // Status badge
      const badgeWidth = 100
      const badgeHeight = 16
      page.drawRectangle({
        x: pageMargin,
        y: y - badgeHeight + 2,
        width: badgeWidth,
        height: badgeHeight,
        color: statusColor
      })
      
      page.drawText(status, {
        x: pageMargin + 5,
        y: y - 10,
        size: 9,
        font: titleFont,
        color: rgb(1, 1, 1)
      })
      
      // Checkpoint name
      page.drawText(`${cp.name}${critical}`, {
        x: pageMargin + badgeWidth + 10,
        y: y - 3,
        size: 12,
        font: critical ? titleFont : bodyFont,
        color: critical ? dangerColor : rgb(0, 0, 0)
      })
      
      y -= 25
      
      // Notes if present
      if (cp.notes) {
        drawText(`Notes: ${cp.notes}`, { 
          font: bodyFont, 
          size: 10, 
          color: secondaryColor, 
          indent: 20,
          lineHeight: 1.4
        })
        y -= 5
      }
      
      // Estimated hours if present
      if (cp.estimatedHours) {
        drawText(`Estimated repair time: ${cp.estimatedHours} hours`, { 
          font: titleFont, 
          size: 10, 
          color: warningColor, 
          indent: 20 
        })
        y -= 5
      }
      
      // Media if present
      if (cp.media && cp.media.length > 0) {
        drawText(`Attachments (${cp.media.length}):`, { 
          font: titleFont, 
          size: 10, 
          color: secondaryColor, 
          indent: 20 
        })
        
        for (const media of cp.media) {
          await drawImage(media, 180)
        }
        y -= 5
      }
      
      // Add spacing between checkpoints
      y -= 15
      
      // Light separator line
      page.drawRectangle({
        x: pageMargin + 20,
        y: y + 5,
        width: contentWidth - 40,
        height: 0.5,
        color: lightGrayColor
      })
      y -= 10
    }
    
    // Add extra spacing between sections
    y -= 20
  }

  // Add page numbers and footer to all pages
  const pages = pdfDoc.getPages()
  const totalPages = pages.length
  const footerText = `Generated on ${new Date().toLocaleString()} | Technical Inspection Platform`
  
  pages.forEach((currentPage, index) => {
    const pageNumber = index + 1
    
    // Page number (right side)
    currentPage.drawText(`Page ${pageNumber} of ${totalPages}`, {
      x: pageWidth - pageMargin - 60,
      y: 30,
      size: 9,
      font: bodyFont,
      color: secondaryColor
    })
    
    // Footer text (left side)
    currentPage.drawText(footerText, {
      x: pageMargin,
      y: 30,
      size: 8,
      font: italicFont,
      color: lightGrayColor
    })
    
    // Footer line
    currentPage.drawRectangle({
      x: pageMargin,
      y: 45,
      width: contentWidth,
      height: 0.5,
      color: lightGrayColor
    })
  })

  return await pdfDoc.save()
}

export function generateEmailContent(inspection: InspectionData) {
  // Build a simple list of video links
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || 'http://localhost:3000'
  const videoLinks: Array<{ filename: string; url: string }> = []
  for (const section of inspection.sections) {
    for (const cp of section.checkpoints) {
      for (const m of (cp.media || [])) {
        if (m.type === 'video') {
          videoLinks.push({ filename: m.filename, url: `${siteUrl}/api/media/${m.id}` })
        }
      }
    }
  }

  const videosHtml = videoLinks.length
    ? `<h3>Attached Videos</h3><ul>${videoLinks.map(v => `<li><a href="${v.url}">${v.filename}</a></li>`).join('')}</ul>`
    : ''
  const videosText = videoLinks.length
    ? `\nVideos:\n${videoLinks.map(v => `- ${v.filename}: ${v.url}`).join('\n')}`
    : ''

  return {
    subject: `Inspection Report - ${inspection.equipment.model} (${inspection.equipment.serial})`,
    html: `
      <h2>Inspection Report</h2>
      <p>Please find the attached inspection report for:</p>
      <ul>
        <li><strong>Equipment:</strong> ${inspection.equipment.model}</li>
        <li><strong>Serial Number:</strong> ${inspection.equipment.serial}</li>
        <li><strong>Date:</strong> ${new Date(inspection.startedAt).toLocaleString()}</li>
        <li><strong>Status:</strong> ${inspection.status.replace(/_/g, ' ')}</li>
        <li><strong>Technician:</strong> ${inspection.technician?.name || 'N/A'}</li>
      </ul>
      ${videosHtml}
      <p>This report was generated automatically by the Technical Inspection Platform.</p>
    `,
    text: `Inspection Report - ${inspection.equipment.model} (${inspection.equipment.serial})\n\nPlease find the attached inspection report PDF.${videosText}`,
    filename: `inspection-${inspection.id}.pdf`
  }
}


