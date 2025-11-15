/**
 * Script to list all nurse login credentials
 * 
 * Usage:
 *   node scripts/list-credentials.js [password]
 * 
 * Shows all nurses with their email addresses and password
 * Default password shown: 1234 (or specify custom password)
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Error: Missing Supabase credentials in .env file');
  console.error('   Required: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const defaultPassword = process.argv[2] || '1234';

async function listCredentials() {
  console.log('\n📋 Nurse Login Credentials\n');
  console.log('═'.repeat(60));

  try {
    // Get all nurses from database
    const { data: nurses, error } = await supabase
      .from('nurses')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('❌ Error fetching nurses:', error.message);
      process.exit(1);
    }

    if (!nurses || nurses.length === 0) {
      console.log('⚠️  No nurses found in the database.');
      return;
    }

    console.log(`\nFound ${nurses.length} nurse account(s):\n`);

    nurses.forEach((nurse, index) => {
      const email = nurse.email || `${nurse.name.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/).join('.')}@hospital.org`;
      const hasAuth = nurse.auth_user_id ? '✅' : '❌';
      
      console.log(`${index + 1}. ${nurse.name}`);
      console.log(`   Email:    ${email}`);
      console.log(`   Password: ${defaultPassword}`);
      console.log(`   Auth:     ${hasAuth} ${nurse.auth_user_id ? 'Linked' : 'Not linked'}`);
      console.log('');
    });

    console.log('═'.repeat(60));
    console.log(`\n💡 All passwords are set to: ${defaultPassword}`);
    console.log('   (If you changed passwords, specify it: node scripts/list-credentials.js yourpassword)\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

listCredentials().catch(console.error);

