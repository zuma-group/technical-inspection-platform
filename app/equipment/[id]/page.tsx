import { prisma } from '@/lib/prisma'
import EquipmentDetailClient from './client'

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getEquipmentWithInspections(id: string) {
  try {
    return await prisma.equipment.findUnique({
      where: { id },
      include: {
        inspections: {
          orderBy: { startedAt: "desc" },
          include: {
            technician: { select: { name: true, email: true } },
            sections: {
              include: {
                checkpoints: true,
              },
            },
          },
        },
      },
    });
  } catch (error) {
    console.error("Failed to fetch equipment detail:", error);
    return null;
  }
}

export default async function EquipmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const equipment = await getEquipmentWithInspections(id);

  // Gather template names for inspections that reference a template
  let templateNameById: Record<string, string> = {}
  let defaultTemplateName: string | undefined
  if (equipment?.inspections?.length) {
    const templateIds = Array.from(
      new Set(
        equipment.inspections
          .map((i: any) => i.templateId)
          .filter((v: string | null | undefined): v is string => Boolean(v))
      )
    );
    if (templateIds.length > 0) {
      const templates = await (prisma as any).inspectionTemplate.findMany({
        where: { id: { in: templateIds } },
        select: { id: true, name: true },
      });
      templateNameById = Object.fromEntries(
        templates.map((t: any) => [t.id, t.name])
      );
    }
    // Fallback for historical inspections without templateId: use current default template name
    const defaultTemplate = await (prisma as any).inspectionTemplate.findFirst({
      where: { equipmentType: (equipment as any).type, isDefault: true },
      select: { id: true, name: true }
    })
    defaultTemplateName = defaultTemplate?.name
  }

  if (!equipment) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="card text-center py-10">Equipment not found</div>
      </div>
    );
  }

  return (
    <EquipmentDetailClient 
      equipment={{
        ...equipment,
        inspections: equipment.inspections.map(insp => ({
          ...insp,
          startedAt: insp.startedAt.toISOString()
        }))
      } as any}
      templateNameById={templateNameById}
      defaultTemplateName={defaultTemplateName}
    />
  )
}
