import { prisma } from '@/lib/prisma'
import EmailReportButton from './email-report-button'
import InspectionDetailClient from './client'

export const dynamic = 'force-dynamic'

async function getInspection(id: string) {
  try {
    return await prisma.inspection.findUnique({
      where: { id },
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
    console.error('Failed to fetch inspection:', error)
    return null
  }
}

export default async function InspectionDetailPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const inspection = await getInspection(id)

  if (!inspection) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="card text-center py-10">Inspection not found</div>
      </div>
    )
  }

  return <InspectionDetailClient inspection={{
    ...inspection,
    startedAt: inspection.startedAt.toISOString()
  } as any} />
}


