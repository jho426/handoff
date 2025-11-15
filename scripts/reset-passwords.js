/**
 * Script to reset all nurse passwords to a common password
 * 
 * Usage:
 *   node scripts/reset-passwords.js [password]
 * 
 * Default password: 1234
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

if (!supabaseServiceKey) {
  console.error('❌ Error: SUPABASE_SERVICE_KEY is required to reset passwords');
  console.error('   Add SUPABASE_SERVICE_KEY to your .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const newPassword = process.argv[2] || '1234';

async function resetPasswords() {
  console.log(`\n🔐 Resetting all nurse passwords to: ${newPassword}\n`);

  try {
    // Get all nurses from database
    const { data: nurses, error: fetchError } = await supabase
      .from('nurses')
      .select('*')
      .order('name', { ascending: true });

    if (fetchError) {
      console.error('❌ Error fetching nurses:', fetchError.message);
      process.exit(1);
    }

    if (!nurses || nurses.length === 0) {
      console.log('⚠️  No nurses found in the database.');
      return;
    }

    console.log(`Found ${nurses.length} nurse(s)\n`);

    const results = [];

    for (const nurse of nurses) {
      // Generate email if missing
      let nurseEmail = nurse.email;
      if (!nurseEmail) {
        const emailName = nurse.name
          .toLowerCase()
          .replace(/[^a-z\s]/g, '')
          .split(/\s+/)
          .join('.');
        nurseEmail = `${emailName}@hospital.org`;
        
        // Update nurse record with generated email
        await supabase
          .from('nurses')
          .update({ email: nurseEmail })
          .eq('id', nurse.id);
        
        console.log(`   Generated email for ${nurse.name}: ${nurseEmail}`);
      }

      // If nurse has auth_user_id, update existing user
      if (nurse.auth_user_id) {
        try {
          const { data: updatedUser, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
            nurse.auth_user_id,
            { password: newPassword }
          );

          if (updateError) {
            results.push({
              name: nurse.name,
              email: nurseEmail,
              status: 'error',
              message: updateError.message,
            });
            continue;
          }

          results.push({
            name: nurse.name,
            email: nurseEmail,
            status: 'updated',
            message: 'Password updated',
          });
        } catch (error) {
          results.push({
            name: nurse.name,
            email: nurseEmail,
            status: 'error',
            message: error.message,
          });
        }
        continue;
      }

      // If no auth account, check if one exists with this email
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
      const existingUser = existingUsers?.users?.find(
        (u) => u.email === nurseEmail
      );

      if (existingUser) {
        // Update existing user password and link to nurse
        try {
          const { data: updatedUser, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
            existingUser.id,
            { password: newPassword }
          );

          if (updateError) {
            results.push({
              name: nurse.name,
              email: nurseEmail,
              status: 'error',
              message: `Failed to update: ${updateError.message}`,
            });
            continue;
          }

          // Link to nurse record
          await supabase
            .from('nurses')
            .update({ auth_user_id: existingUser.id })
            .eq('id', nurse.id);

          results.push({
            name: nurse.name,
            email: nurseEmail,
            status: 'updated',
            message: 'Password updated and linked',
          });
        } catch (error) {
          results.push({
            name: nurse.name,
            email: nurseEmail,
            status: 'error',
            message: error.message,
          });
        }
        continue;
      }

      // Create new auth account with the password
      try {
        const { data: authUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: nurseEmail,
          password: newPassword,
          email_confirm: true,
          user_metadata: {
            name: nurse.name,
            nurse_id: nurse.id,
          },
        });

        if (createError) {
          results.push({
            name: nurse.name,
            email: nurseEmail,
            status: 'error',
            message: createError.message,
          });
          continue;
        }

        // Link auth user ID to nurse record
        await supabase
          .from('nurses')
          .update({ auth_user_id: authUser.user.id })
          .eq('id', nurse.id);

        results.push({
          name: nurse.name,
          email: nurseEmail,
          status: 'created',
          message: 'Account created with password',
        });
      } catch (error) {
        results.push({
          name: nurse.name,
          email: nurseEmail,
          status: 'error',
          message: error.message,
        });
      }
    }

    // Display results
    console.log('Results:\n');
    
    const updated = results.filter(r => r.status === 'updated');
    const created = results.filter(r => r.status === 'created');
    const errors = results.filter(r => r.status === 'error');

    if (updated.length > 0) {
      console.log('✅ Updated passwords:');
      updated.forEach(r => {
        console.log(`   ${r.name} (${r.email})`);
      });
      console.log('');
    }

    if (created.length > 0) {
      console.log('✅ Created accounts:');
      created.forEach(r => {
        console.log(`   ${r.name} (${r.email})`);
      });
      console.log('');
    }

    if (errors.length > 0) {
      console.log('❌ Errors:');
      errors.forEach(r => {
        console.log(`   ${r.name} (${r.email}): ${r.message}`);
      });
      console.log('');
    }

    console.log(`\n📊 Summary:`);
    console.log(`   ✅ Updated: ${updated.length}`);
    console.log(`   ✅ Created: ${created.length}`);
    console.log(`   ❌ Errors: ${errors.length}`);
    console.log(`\n💡 All passwords are now: ${newPassword}`);
    console.log(`   Nurses can log in with their email and password: ${newPassword}\n`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

resetPasswords().catch(console.error);

