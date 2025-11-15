/**
 * Test login credentials directly
 * 
 * Usage:
 *   node scripts/test-login.js <email> <password>
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Error: Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const email = process.argv[2] || 'james.wilson@hospital.org';
const password = process.argv[3] || '1234';

async function testLogin() {
  console.log(`\n🔐 Testing login credentials...\n`);
  console.log(`Email: ${email}`);
  console.log(`Password: ${password}\n`);
  console.log('═'.repeat(60));

  try {
    // Try to sign in
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      console.log('❌ Login failed!');
      console.log(`Error: ${authError.message}`);
      console.log(`Error code: ${authError.status || 'N/A'}\n`);
      
      // Check if user exists
      console.log('Checking if user exists in database...\n');
      
      const { data: nurse, error: nurseError } = await supabase
        .from('nurses')
        .select('*')
        .eq('email', email)
        .single();

      if (nurseError) {
        console.log('❌ Nurse not found in database with this email');
        console.log(`Error: ${nurseError.message}\n`);
      } else {
        console.log('✅ Nurse found in database:');
        console.log(`   Name: ${nurse.name}`);
        console.log(`   Email: ${nurse.email}`);
        console.log(`   Auth User ID: ${nurse.auth_user_id || 'Not linked'}\n`);
        
        if (!nurse.auth_user_id) {
          console.log('⚠️  Nurse record exists but auth account is not linked!');
          console.log('   Run: npm run nurses:reset-passwords\n');
        }
      }

      // Provide suggestions
      console.log('💡 Suggestions:');
      console.log('   1. Verify the email is correct (check for typos)');
      console.log('   2. Verify the password is correct');
      console.log('   3. Run: npm run nurses:reset-passwords');
      console.log('   4. Check: npm run nurses:check\n');
      
      process.exit(1);
    }

    console.log('✅ Login successful!');
    console.log(`User ID: ${authData.user.id}`);
    console.log(`Email: ${authData.user.email}`);
    console.log(`Email confirmed: ${authData.user.email_confirmed_at ? 'Yes' : 'No'}\n`);

    // Check nurse record
    const { data: nurse, error: nurseError } = await supabase
      .from('nurses')
      .select('*')
      .eq('email', email)
      .single();

    if (nurseError) {
      console.log('⚠️  Auth works but nurse record not found in database');
    } else {
      console.log('✅ Nurse record found:');
      console.log(`   Name: ${nurse.name}`);
      console.log(`   ID: ${nurse.id}`);
    }

    // Sign out
    await supabase.auth.signOut();
    console.log('\n✅ Test completed successfully!\n');

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    process.exit(1);
  }
}

testLogin().catch(console.error);

