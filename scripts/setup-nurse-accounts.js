/**
 * Helper script to list nurses and create auth accounts for them
 * 
 * Usage:
 *   node scripts/setup-nurse-accounts.js list    - List all nurses in database
 *   node scripts/setup-nurse-accounts.js create   - Create auth accounts for all nurses
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Error: Missing Supabase credentials in .env file');
  console.error('   Required: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
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

async function listNurses() {
  console.log('\n📋 Fetching nurses from database...\n');
  
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
    console.log('   Add nurses to your Supabase "nurses" table first.');
    return;
  }

  console.log(`Found ${nurses.length} nurse(s):\n`);
  
  nurses.forEach((nurse, index) => {
    console.log(`${index + 1}. ${nurse.name}`);
    console.log(`   Email: ${nurse.email || '❌ No email'}`);
    console.log(`   ID: ${nurse.id}`);
    console.log(`   Auth Account: ${nurse.auth_user_id ? '✅ Linked' : '❌ Not linked'}`);
    console.log('');
  });

  const withAccounts = nurses.filter(n => n.auth_user_id).length;
  const withoutAccounts = nurses.filter(n => !n.auth_user_id).length;

  console.log(`\n📊 Summary:`);
  console.log(`   ✅ ${withAccounts} nurse(s) with auth accounts`);
  console.log(`   ❌ ${withoutAccounts} nurse(s) without auth accounts`);

  if (withoutAccounts > 0 && !supabaseAdmin) {
    console.log(`\n⚠️  To create accounts, run: node scripts/setup-nurse-accounts.js create`);
    console.log(`   (Requires SUPABASE_SERVICE_KEY in .env)`);
  }
}

async function createAccounts() {
  if (!supabaseAdmin) {
    console.error('❌ Error: SUPABASE_SERVICE_KEY is required to create accounts');
    console.error('   Add SUPABASE_SERVICE_KEY to your .env file');
    process.exit(1);
  }

  console.log('\n🔐 Creating auth accounts for nurses...\n');

  const { data: nurses, error: fetchError } = await supabase
    .from('nurses')
    .select('*');

  if (fetchError) {
    console.error('❌ Error fetching nurses:', fetchError.message);
    process.exit(1);
  }

  if (!nurses || nurses.length === 0) {
    console.log('⚠️  No nurses found in the database.');
    return;
  }

  const results = [];
  
  for (const nurse of nurses) {
    // Skip if nurse already has an auth_user_id
    if (nurse.auth_user_id) {
      results.push({
        nurse_id: nurse.id,
        name: nurse.name,
        email: nurse.email,
        status: 'skipped',
        message: 'Already has auth account',
      });
      continue;
    }

    // Generate email if missing
    let nurseEmail = nurse.email;
    if (!nurseEmail) {
      // Generate email from name (e.g., "Emily Chen" -> "emily.chen@hospital.org")
      const emailName = nurse.name
        .toLowerCase()
        .replace(/[^a-z\s]/g, '') // Remove special chars
        .split(/\s+/)
        .join('.');
      nurseEmail = `${emailName}@hospital.org`;
      
      // Update nurse record with generated email
      const { error: updateEmailError } = await supabase
        .from('nurses')
        .update({ email: nurseEmail })
        .eq('id', nurse.id);
      
      if (updateEmailError) {
        results.push({
          nurse_id: nurse.id,
          name: nurse.name,
          email: null,
          status: 'error',
          message: `Failed to generate email: ${updateEmailError.message}`,
        });
        continue;
      }
      
      console.log(`   Generated email for ${nurse.name}: ${nurseEmail}`);
    }

    // Check if auth user already exists with this email
    const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      results.push({
        nurse_id: nurse.id,
        name: nurse.name,
        email: nurse.email,
        status: 'error',
        message: `Failed to list users: ${listError.message}`,
      });
      continue;
    }

    const existingUser = existingUsers?.users?.find(
      (u) => u.email === nurseEmail
    );

    if (existingUser) {
      // Link existing auth user to nurse record
      const { error: updateError } = await supabase
        .from('nurses')
        .update({ auth_user_id: existingUser.id })
        .eq('id', nurse.id);

      if (updateError) {
        results.push({
          nurse_id: nurse.id,
          name: nurse.name,
          email: nurse.email,
          status: 'error',
          message: `Failed to link: ${updateError.message}`,
        });
        continue;
      }

      results.push({
        nurse_id: nurse.id,
        name: nurse.name,
        email: nurseEmail,
        status: 'linked',
        message: 'Linked to existing auth account',
      });
      continue;
    }

    // Create new auth account for nurse
    const tempPassword = `Temp${nurse.id}${Date.now()}`;
    
    const { data: authUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: nurseEmail,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        name: nurse.name,
        nurse_id: nurse.id,
      },
    });

    if (createError) {
      results.push({
        nurse_id: nurse.id,
        name: nurse.name,
        email: nurseEmail,
        status: 'error',
        message: createError.message,
      });
      continue;
    }

    // Link auth user ID to nurse record
    const { error: linkError } = await supabase
      .from('nurses')
      .update({ auth_user_id: authUser.user.id })
      .eq('id', nurse.id);

    if (linkError) {
      results.push({
        nurse_id: nurse.id,
        name: nurse.name,
        email: nurseEmail,
        status: 'error',
        message: `Account created but failed to link: ${linkError.message}`,
        tempPassword: tempPassword,
      });
      continue;
    }

    results.push({
      nurse_id: nurse.id,
      name: nurse.name,
      email: nurseEmail,
      status: 'created',
      message: 'Account created successfully',
      tempPassword: tempPassword,
    });
  }

  // Display results
  console.log('Results:\n');
  
  const created = results.filter(r => r.status === 'created');
  const linked = results.filter(r => r.status === 'linked');
  const skipped = results.filter(r => r.status === 'skipped');
  const errors = results.filter(r => r.status === 'error');

  if (created.length > 0) {
    console.log('✅ Created accounts:');
    created.forEach(r => {
      console.log(`   ${r.name} (${r.email})`);
      console.log(`   Password: ${r.tempPassword}`);
    });
    console.log('');
  }

  if (linked.length > 0) {
    console.log('🔗 Linked existing accounts:');
    linked.forEach(r => {
      console.log(`   ${r.name} (${r.email})`);
    });
    console.log('');
  }

  if (skipped.length > 0) {
    console.log('⏭️  Skipped (already have accounts):');
    skipped.forEach(r => {
      console.log(`   ${r.name} (${r.email})`);
    });
    console.log('');
  }

  if (errors.length > 0) {
    console.log('❌ Errors:');
    errors.forEach(r => {
      console.log(`   ${r.name} (${r.email || 'no email'}): ${r.message}`);
    });
    console.log('');
  }

  console.log(`\n📊 Summary:`);
  console.log(`   ✅ Created: ${created.length}`);
  console.log(`   🔗 Linked: ${linked.length}`);
  console.log(`   ⏭️  Skipped: ${skipped.length}`);
  console.log(`   ❌ Errors: ${errors.length}`);

  if (created.length > 0) {
    console.log(`\n💡 Nurses can now log in with their email and the temporary password shown above.`);
    console.log(`   They should change their password after first login.`);
  }
}

// Main
const command = process.argv[2];

if (command === 'list') {
  listNurses().catch(console.error);
} else if (command === 'create') {
  createAccounts().catch(console.error);
} else {
  console.log('Usage:');
  console.log('  node scripts/setup-nurse-accounts.js list    - List all nurses in database');
  console.log('  node scripts/setup-nurse-accounts.js create - Create auth accounts for all nurses');
  process.exit(1);
}

