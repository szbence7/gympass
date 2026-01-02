import { db } from './index';
import { passTypes, staffUsers, users } from './schema';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';

async function seed() {
  console.log('Seeding database...');

  const existingPassTypes = await db.select().from(passTypes);
  
  if (existingPassTypes.length === 0) {
    console.log('Creating pass types...');
    
    await db.insert(passTypes).values([
      {
        id: uuidv4(),
        code: 'WEEKLY',
        name: 'Weekly Pass',
        description: 'Unlimited access for 7 days',
        durationDays: 7,
        totalEntries: null,
        price: 29.99,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: uuidv4(),
        code: 'MONTHLY',
        name: 'Monthly Pass',
        description: 'Unlimited access for 30 days',
        durationDays: 30,
        totalEntries: null,
        price: 99.99,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: uuidv4(),
        code: 'TEN_ENTRY',
        name: '10-Entry Pass',
        description: '10 gym entries (valid for 90 days)',
        durationDays: 90,
        totalEntries: 10,
        price: 79.99,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    
    console.log('Pass types created!');
  } else {
    console.log('Pass types already exist, skipping...');
  }

  const existingStaff = await db.select().from(staffUsers).where(eq(staffUsers.email, 'staff@gym.local'));
  
  if (existingStaff.length === 0) {
    console.log('Creating staff user...');
    
    const hashedPassword = await bcrypt.hash('staff1234', 10);
    
    await db.insert(staffUsers).values({
      id: uuidv4(),
      email: 'staff@gym.local',
      password: hashedPassword,
      name: 'Staff User',
      role: 'STAFF',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    
    console.log('Staff user created!');
    console.log('Email: staff@gym.local');
    console.log('Password: staff1234');
  } else {
    console.log('Staff user already exists, skipping...');
  }

  const existingGuestUser = await db.select().from(users).where(eq(users.email, 'guest@gym.local'));
  
  if (existingGuestUser.length === 0) {
    console.log('Creating guest user for testing...');
    
    const hashedPassword = await bcrypt.hash('guest1234', 10);
    
    await db.insert(users).values({
      id: uuidv4(),
      email: 'guest@gym.local',
      password: hashedPassword,
      name: 'Guest User',
      role: 'USER',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    
    console.log('Guest user created!');
    console.log('Email: guest@gym.local');
    console.log('Password: guest1234');
  } else {
    console.log('Guest user already exists, skipping...');
  }

  console.log('Seeding completed successfully!');
}

seed().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
