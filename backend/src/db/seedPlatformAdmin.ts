import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { getRegistryDb, getPlatformAdminByEmail, createPlatformAdmin } from './registry';

/**
 * Seeds a default platform admin user for testing
 * Email: admin@gympass.com
 * Password: admin123
 */
export async function seedDefaultPlatformAdmin() {
  const email = 'admin@gympass.com';
  const password = 'admin123';
  const name = 'Platform Admin';

  try {
    // Ensure registry DB is initialized
    getRegistryDb();

    // Check if admin already exists
    const existing = getPlatformAdminByEmail(email);
    if (existing) {
      // Verify password works - if not, recreate
      const passwordValid = await bcrypt.compare(password, existing.password);
      if (passwordValid) {
        console.log('Platform admin already exists with correct password:', email);
        return;
      } else {
        console.log('Platform admin exists but password hash is invalid. Recreating...');
        // Delete old admin and recreate
        const db = getRegistryDb();
        db.prepare('DELETE FROM platform_admins WHERE email = ?').run(email);
      }
    }

    // Create admin
    const hashedPassword = await bcrypt.hash(password, 10);
    const adminId = uuidv4();

    createPlatformAdmin(adminId, email, hashedPassword, name);

    console.log('✅ Platform admin created successfully!');
    console.log('Email:', email);
    console.log('Password:', password);
    console.log('⚠️  Change this password in production!');
  } catch (error) {
    console.error('Failed to seed platform admin:', error);
    throw error;
  }
}

// Run if executed directly
if (require.main === module) {
  seedDefaultPlatformAdmin()
    .then(() => {
      console.log('Seeding complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Seeding failed:', error);
      process.exit(1);
    });
}



