'use server'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  try {
    const payload = await req.json()

    if (!payload || !payload.template) {
      return NextResponse.json({ error: 'Invalid import payload' }, { status: 400 })
    }

    const t = payload.template
    if (!t.name || !t.equipmentType || !Array.isArray(t.sections)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const created = await (prisma as any).inspectionTemplate.create({
      data: {
        name: t.name,
        description: t.description || null,
        equipmentType: t.equipmentType,
        isDefault: !!t.isDefault,
        requiresFreightId: !!t.requiresFreightId,
        sections: {
          create: t.sections.map((s: any, sIdx: number) => ({
            name: s.name,
            order: s.order ?? sIdx + 1,
            checkpoints: {
              create: (s.checkpoints || []).map((c: any, cIdx: number) => ({
                name: c.name,
                critical: !!c.critical,
                order: c.order ?? cIdx + 1
              }))
            }
          }))
        }
      }
    })

    return NextResponse.json({ success: true, id: created.id })
  } catch (err) {
    console.error('Template import failed:', err)
    return NextResponse.json({ error: 'Failed to import template' }, { status: 500 })
  }
}


