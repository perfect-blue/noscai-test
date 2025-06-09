//prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create users
  const hashedPassword = await bcrypt.hash('password123', 10);
  
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      name: 'Admin User',
      role: 'admin'
    }
  });

  const regularUser1 = await prisma.user.upsert({
    where: { email: 'john@example.com' },
    update: {},
    create: {
      email: 'john@example.com',
      name: 'John Doe',
      role: 'user'
    }
  });

  const regularUser2 = await prisma.user.upsert({
    where: { email: 'jane@example.com' },
    update: {},
    create: {
      email: 'jane@example.com',
      name: 'Jane Smith',
      role: 'user'
    }
  });

  const doctorUser = await prisma.user.upsert({
    where: { email: 'dr.wilson@example.com' },
    update: {},
    create: {
      email: 'dr.wilson@example.com',
      name: 'Dr. Wilson',
      role: 'doctor'
    }
  });

  console.log('👥 Created users:', {
    admin: adminUser.name,
    user1: regularUser1.name,
    user2: regularUser2.name,
    doctor: doctorUser.name
  });

  // Create appointments
  const appointments = [
    {
      id: 'appt-001',
      title: 'Annual Checkup - John Doe',
      description: 'Routine annual physical examination and health assessment',
      startTime: new Date('2024-12-15T09:00:00Z'),
      endTime: new Date('2024-12-15T10:00:00Z')
    },
    {
      id: 'appt-002', 
      title: 'Follow-up Consultation - Jane Smith',
      description: 'Follow-up appointment to review test results and discuss treatment plan',
      startTime: new Date('2024-12-15T14:30:00Z'),
      endTime: new Date('2024-12-15T15:30:00Z')
    },
    {
      id: 'appt-003',
      title: 'Vaccination Appointment',
      description: 'Flu vaccination and general health screening',
      startTime: new Date('2024-12-16T11:00:00Z'),
      endTime: new Date('2024-12-16T11:30:00Z')
    },
    {
      id: 'appt-004',
      title: 'Dental Cleaning - Emergency',
      description: 'Emergency dental cleaning and examination',
      startTime: new Date('2024-12-17T08:00:00Z'),
      endTime: new Date('2024-12-17T09:00:00Z')
    },
    {
      id: 'appt-005',
      title: 'Physical Therapy Session',
      description: 'Weekly physical therapy session for knee rehabilitation',
      startTime: new Date('2024-12-18T16:00:00Z'),
      endTime: new Date('2024-12-18T17:00:00Z')
    }
  ];

  for (const appointment of appointments) {
    await prisma.appointment.upsert({
      where: { id: appointment.id },
      update: {},
      create: appointment
    });
  }

  console.log('📅 Created appointments:', appointments.length);

  // Create some test locks (optional)
  const testLock = await prisma.appointmentLock.upsert({
    where: { appointmentId: 'appt-003' },
    update: {},
    create: {
      appointmentId: 'appt-003',
      userId: regularUser1.id,
      expiresAt: new Date(Date.now() + 2 * 60 * 1000) // Expires in 2 minutes for testing
    }
  });

  console.log('🔒 Created test lock for appointment appt-003');

  console.log('✅ Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });