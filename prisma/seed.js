const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  // Clear existing data
  await prisma.checkpoint.deleteMany()
  await prisma.section.deleteMany()
  await prisma.inspection.deleteMany()
  await prisma.equipment.deleteMany()
  await prisma.user.deleteMany()

  // Create default user
  await prisma.user.create({
    data: {
      email: 'tech@system.local',
      name: 'Field Technician',
    },
  })

  // Create equipment
  const equipment = [
    {
      type: 'Boom Lift',
      model: 'JLG 600S',
      serial: 'JLG-2024-001',
      location: 'Site A - North',
      hoursUsed: 1250,
      status: 'OPERATIONAL',
    },
    {
      type: 'Scissor Lift',
      model: 'Genie GS-3246',
      serial: 'GN-2024-102',
      location: 'Site A - South',
      hoursUsed: 890,
      status: 'OPERATIONAL',
    },
    {
      type: 'Telehandler',
      model: 'CAT TH514D',
      serial: 'CAT-2023-055',
      location: 'Site B - East',
      hoursUsed: 2100,
      status: 'MAINTENANCE',
    },
    {
      type: 'Boom Lift',
      model: 'Genie Z-45/25',
      serial: 'GN-2023-203',
      location: 'Site B - West',
      hoursUsed: 1678,
      status: 'OPERATIONAL',
    },
    {
      type: 'Scissor Lift',
      model: 'JLG 2646ES',
      serial: 'JLG-2024-045',
      location: 'Warehouse 1',
      hoursUsed: 445,
      status: 'OPERATIONAL',
    },
  ]

  for (const item of equipment) {
    await prisma.equipment.create({ data: item })
  }

  console.log('✅ Database seeded successfully!')
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })