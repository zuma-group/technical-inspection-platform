'use server'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const template = await (prisma as any).inspectionTemplate.findUnique({
      where: { id },
      include: {
        sections: {
          orderBy: { order: 'asc' },
          include: { checkpoints: { orderBy: { order: 'asc' } } }
        }
      }
    })

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    const payload = {
      exportVersion: '1.0.0',
      exportedAt: new Date().toISOString(),
      template: {
        name: template.name,
        description: template.description,
        equipmentType: template.equipmentType,
        isDefault: template.isDefault,
        requiresFreightId: template.requiresFreightId,
        sections: template.sections.map((s: any) => ({
          name: s.name,
          order: s.order,
          checkpoints: s.checkpoints.map((c: any) => ({
            name: c.name,
            critical: c.critical,
            order: c.order
          }))
        }))
      }
    }

    const body = JSON.stringify(payload, null, 2)
    const filename = `${template.name.replace(/[^a-z0-9-_]+/gi, '_')}.template.json`
    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    })
  } catch (err) {
    console.error('Template export failed:', err)
    return NextResponse.json({ error: 'Failed to export template' }, { status: 500 })
  }
}


