/**
 * Diagnostic script to check auth status and verify accounts
 * 
 * Usage:
 *   node scripts/check-auth-status.js
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Error: Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const supabaseAdmin = supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;

async function checkAuthStatus() {
  console.log('\n🔍 Checking Auth Status...\n');
  console.log('═'.repeat(70));

  try {
    // Get all nurses from database
    const { data: nurses, error: nursesError } = await supabase
      .from('nurses')
      .select('*')
      .order('name', { ascending: true });

    if (nursesError) {
      console.error('❌ Error fetching nurses:', nursesError.message);
      process.exit(1);
    }

    console.log(`\n📋 Found ${nurses?.length || 0} nurse(s) in database:\n`);

    if (!nurses || nurses.length === 0) {
      console.log('⚠️  No nurses found. Run: npm run nurses:create');
      return;
    }

    // Get all auth users if we have admin access
    let authUsers = [];
    if (supabaseAdmin) {
      try {
        const { data: usersData } = await supabaseAdmin.auth.admin.listUsers();
        authUsers = usersData?.users || [];
      } catch (err) {
        console.log('⚠️  Could not list auth users (need service key)');
      }
    }

    nurses.forEach((nurse, index) => {
      const email = nurse.email || '❌ NO EMAIL';
      const hasAuthId = nurse.auth_user_id ? '✅' : '❌';
      
      // Find matching auth user
      const authUser = authUsers.find(u => 
        u.email === email || u.id === nurse.auth_user_id
      );

      console.log(`${index + 1}. ${nurse.name}`);
      console.log(`   Email:         ${email}`);
      console.log(`   Auth User ID:  ${hasAuthId} ${nurse.auth_user_id || 'Not linked'}`);
      console.log(`   Auth Account:  ${authUser ? '✅ Exists' : '❌ Missing'}`);
      
      if (authUser) {
        console.log(`   Auth Email:    ${authUser.email}`);
        console.log(`   Confirmed:     ${authUser.email_confirmed_at ? '✅' : '❌'}`);
        console.log(`   Created:       ${new Date(authUser.created_at).toLocaleString()}`);
      }
      console.log('');
    });

    console.log('═'.repeat(70));
    console.log('\n📊 Summary:\n');
    
    const withEmail = nurses.filter(n => n.email).length;
    const withAuthId = nurses.filter(n => n.auth_user_id).length;
    const withAuthAccount = nurses.filter(n => {
      const email = n.email;
      return authUsers.some(u => u.email === email || u.id === n.auth_user_id);
    }).length;

    console.log(`   Nurses in DB:        ${nurses.length}`);
    console.log(`   With email:         ${withEmail}/${nurses.length}`);
    console.log(`   With auth_user_id:  ${withAuthId}/${nurses.length}`);
    console.log(`   With auth account:  ${withAuthAccount}/${nurses.length}`);
    console.log(`   Total auth users:   ${authUsers.length}`);

    if (withAuthAccount < nurses.length) {
      console.log('\n⚠️  Some nurses are missing auth accounts!');
      console.log('   Run: npm run nurses:reset-passwords');
    }

    if (withEmail < nurses.length) {
      console.log('\n⚠️  Some nurses are missing email addresses!');
      console.log('   The reset-passwords script will generate them.');
    }

    console.log('\n💡 To see login credentials: npm run nurses:credentials\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkAuthStatus().catch(console.error);

