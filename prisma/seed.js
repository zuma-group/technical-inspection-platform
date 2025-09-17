const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')
const prisma = new PrismaClient()

async function main() {
  // Clear existing data
  await prisma.media.deleteMany()
  await prisma.checkpoint.deleteMany()
  await prisma.section.deleteMany()
  await prisma.inspection.deleteMany()
  await prisma.templateCheckpoint.deleteMany()
  await prisma.templateSection.deleteMany()
  await prisma.inspectionTemplate.deleteMany()
  await prisma.equipment.deleteMany()
  await prisma.user.deleteMany()

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 12)
  const adminUser = await prisma.user.create({
    data: {
      email: 'zumadev2@zumasales.com',
      name: 'System Administrator',
      password: adminPassword,
      role: 'ADMIN'
    },
  })

  // Create default technician user
  const techPassword = await bcrypt.hash('tech123', 12)
  const techUser = await prisma.user.create({
    data: {
      email: 'tech@system.local',
      name: 'Field Technician',
      password: techPassword,
      role: 'TECHNICIAN'
    },
  })

  console.log('✅ Created users:')
  console.log(`   Admin: admin@system.local / admin123`)
  console.log(`   Tech:  tech@system.local / tech123`)

  // Create default templates
  const boomLiftTemplate = await prisma.inspectionTemplate.create({
    data: {
      name: 'Standard Boom Lift Inspection',
      description: 'Comprehensive inspection checklist for boom lifts',
      equipmentType: 'BOOM_LIFT',
      isDefault: true,
      sections: {
        create: [
          {
            name: 'Platform & Basket',
            order: 1,
            checkpoints: {
              create: [
                { name: 'Guard Rails Secure', critical: true, order: 1 },
                { name: 'Gate Functions', critical: true, order: 2 },
                { name: 'Control Panel', critical: false, order: 3 },
                { name: 'Emergency Stop', critical: true, order: 4 },
                { name: 'Floor Condition', critical: false, order: 5 },
              ]
            }
          },
          {
            name: 'Boom & Hydraulics',
            order: 2,
            checkpoints: {
              create: [
                { name: 'Hydraulic Fluid Level', critical: true, order: 1 },
                { name: 'Cylinder Condition', critical: true, order: 2 },
                { name: 'Hose Inspection', critical: true, order: 3 },
                { name: 'Boom Movement', critical: false, order: 4 },
              ]
            }
          }
        ]
      }
    }
  })

  const scissorLiftTemplate = await prisma.inspectionTemplate.create({
    data: {
      name: 'Standard Scissor Lift Inspection',
      description: 'Basic inspection checklist for scissor lifts',
      equipmentType: 'SCISSOR_LIFT',
      isDefault: true,
      sections: {
        create: [
          {
            name: 'Platform',
            order: 1,
            checkpoints: {
              create: [
                { name: 'Platform Rails', critical: true, order: 1 },
                { name: 'Entry Gate', critical: true, order: 2 },
                { name: 'Controls', critical: false, order: 3 },
              ]
            }
          },
          {
            name: 'Scissor Mechanism',
            order: 2,
            checkpoints: {
              create: [
                { name: 'Scissor Arms', critical: true, order: 1 },
                { name: 'Pivot Points', critical: true, order: 2 },
              ]
            }
          }
        ]
      }
    }
  })

  const telehandlerTemplate = await prisma.inspectionTemplate.create({
    data: {
      name: 'Standard Telehandler Inspection',
      description: 'Comprehensive inspection checklist for telehandlers',
      equipmentType: 'TELEHANDLER',
      isDefault: true,
      sections: {
        create: [
          {
            name: 'Boom & Fork',
            order: 1,
            checkpoints: {
              create: [
                { name: 'Fork Condition', critical: true, order: 1 },
                { name: 'Boom Extension', critical: true, order: 2 },
                { name: 'Load Chart', critical: false, order: 3 },
              ]
            }
          },
          {
            name: 'Cab & Controls',
            order: 2,
            checkpoints: {
              create: [
                { name: 'Seat & Seatbelt', critical: true, order: 1 },
                { name: 'Mirrors & Glass', critical: false, order: 2 },
                { name: 'Controls Operation', critical: true, order: 3 },
              ]
            }
          }
        ]
      }
    }
  })

  console.log('✅ Created default templates')

  // Create equipment
  const equipment = [
    {
      type: 'BOOM_LIFT',
      model: 'JLG 600S',
      serial: 'JLG-2024-001',
      location: 'Site A - North',
      hoursUsed: 1250,
      status: 'OPERATIONAL',
    },
    {
      type: 'SCISSOR_LIFT',
      model: 'Genie GS-3246',
      serial: 'GN-2024-102',
      location: 'Site A - South',
      hoursUsed: 890,
      status: 'OPERATIONAL',
    },
    {
      type: 'TELEHANDLER',
      model: 'CAT TH514D',
      serial: 'CAT-2023-055',
      location: 'Site B - East',
      hoursUsed: 2100,
      status: 'MAINTENANCE',
    },
    {
      type: 'BOOM_LIFT',
      model: 'Genie Z-45/25',
      serial: 'GN-2023-203',
      location: 'Site B - West',
      hoursUsed: 1678,
      status: 'OPERATIONAL',
    },
    {
      type: 'SCISSOR_LIFT',
      model: 'JLG 2646ES',
      serial: 'JLG-2024-045',
      location: 'Warehouse 1',
      hoursUsed: 445,
      status: 'OPERATIONAL',
    },
    {
      type: 'FORKLIFT',
      model: 'Toyota 8FGU25',
      serial: 'TY-2024-089',
      location: 'Warehouse 2',
      hoursUsed: 3200,
      status: 'OPERATIONAL',
    },
  ]

  for (const item of equipment) {
    await prisma.equipment.create({ data: item })
  }

  console.log('✅ Created equipment')

  console.log('✅ Database seeded successfully!')
  console.log('\n📋 Login credentials:')
  console.log('   Admin: admin@system.local / admin123')
  console.log('   Technician: tech@system.local / tech123')
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })