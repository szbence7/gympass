import { createApp } from './app';
import { env } from './utils/env';
import { seedDefaultPlatformAdmin } from './db/seedPlatformAdmin';
import { listGyms, seedDummyBusinessInfo, backfillStaffLoginPaths } from './db/registry';
import { buildTenantUrl, buildPublicBaseUrl } from './utils/urlBuilder';

const app = createApp();

const PORT = parseInt(env.PORT);

// Seed platform admin on startup (only creates if doesn't exist)
seedDefaultPlatformAdmin().catch((error) => {
  console.error('❌ Failed to seed platform admin:', error);
  console.error('You may need to run: npx tsx src/db/seedPlatformAdmin.ts');
});

// Seed dummy business info for existing gyms (idempotent)
seedDummyBusinessInfo();

// Backfill staff login paths for existing gyms (idempotent)
backfillStaffLoginPaths();

app.listen(PORT, () => {
  console.log('\n' + '='.repeat(70));
  console.log('🚀 GymPass SaaS - Server Started Successfully');
  console.log('='.repeat(70));
  
  const publicBaseUrl = buildPublicBaseUrl();
  const tenantBaseDomain = env.TENANT_BASE_DOMAIN || 'gympass.local';
  const isDev = env.NODE_ENV !== 'production';
  
  console.log('\n📡 BACKEND API:');
  console.log(`   → ${publicBaseUrl}`);
  console.log(`   → Health: ${publicBaseUrl}/health`);
  
  console.log('\n🏋️  GYM REGISTRATION (Public):');
  console.log(`   → ${publicBaseUrl}/register`);
  
  console.log('\n🔐 PLATFORM ADMIN (SaaS Owner):');
  if (isDev) {
    console.log(`   → Login: http://localhost:5173/admin/login`);
    console.log(`   → Dashboard: http://localhost:5173/admin`);
    console.log(`   → Manage Gyms: http://localhost:5173/admin/gyms`);
  } else {
    console.log(`   → Login: ${publicBaseUrl}/admin/login`);
    console.log(`   → Dashboard: ${publicBaseUrl}/admin`);
    console.log(`   → Manage Gyms: ${publicBaseUrl}/admin/gyms`);
  }
  console.log(`   → Credentials: admin@gympass.com / admin123`);
  
  console.log('\n👔 GYM STAFF PORTALS:');
  if (isDev) {
    console.log(`   → Default Gym: http://localhost:5173`);
  } else {
    console.log(`   → Default Gym: ${buildTenantUrl('default')}`);
  }
  
  try {
    const gyms = listGyms(false); // Exclude deleted gyms
    if (gyms.length > 0) {
      console.log(`   → Registered Gyms (${gyms.length}):`);
      gyms.slice(0, 10).forEach(gym => {
        const statusIcon = gym.status === 'ACTIVE' ? '✅' : gym.status === 'BLOCKED' ? '🚫' : '❌';
        const gymUrl = buildTenantUrl(gym.slug);
        if (isDev) {
          console.log(`      ${statusIcon} ${gym.name}: ${gymUrl.replace(':4000', ':5173')}`);
        } else {
          console.log(`      ${statusIcon} ${gym.name}: ${gymUrl}`);
        }
      });
      if (gyms.length > 10) {
        console.log(`      ... and ${gyms.length - 10} more gyms`);
      }
      if (isDev && tenantBaseDomain.includes('local')) {
        console.log(`\n   ⚠️  Add to /etc/hosts: 127.0.0.1  <slug>.${tenantBaseDomain}`);
      }
    }
  } catch (e) {
    // Registry DB not ready yet
  }
  
  console.log('\n📱 MOBILE APP:');
  console.log(`   → Expo Dev Server: Check terminal for QR code`);
  console.log(`   → iOS Simulator: Press 'i' in Expo terminal`);
  console.log(`   → Android Emulator: Press 'a' in Expo terminal`);
  
  console.log('\n📚 DOCUMENTATION:');
  console.log(`   → Platform Admin Guide: PLATFORM_ADMIN_GUIDE.md`);
  console.log(`   → Quick Start: QUICKSTART.md`);
  console.log(`   → SaaS Conversion: SAAS_CONVERSION_SUMMARY.md`);
  
  console.log('\n' + '='.repeat(70));
  console.log('✨ All systems ready! Happy coding!');
  console.log('='.repeat(70) + '\n');
});
