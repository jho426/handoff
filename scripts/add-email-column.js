/**
 * Script to add email column to nurses table via Supabase
 * 
 * Usage:
 *   node scripts/add-email-column.js
 * 
 * This will add the email and auth_user_id columns to your nurses table
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Missing Supabase credentials in .env file');
  console.error('   Required: VITE_SUPABASE_URL and SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function addEmailColumn() {
  console.log('\n🔧 Adding email column to nurses table...\n');

  try {
    // Check current table structure
    const { data: nurses, error: fetchError } = await supabaseAdmin
      .from('nurses')
      .select('*')
      .limit(1);

    if (fetchError && !fetchError.message.includes('column') && !fetchError.message.includes('email')) {
      console.error('❌ Error accessing nurses table:', fetchError.message);
      process.exit(1);
    }

    // Use RPC or direct SQL to add columns
    // Since Supabase JS doesn't have direct ALTER TABLE, we'll use SQL
    console.log('⚠️  Supabase JS client cannot directly alter table structure.');
    console.log('   Please run the SQL script in your Supabase SQL Editor instead.\n');
    console.log('📝 Steps:');
    console.log('   1. Go to your Supabase project dashboard');
    console.log('   2. Navigate to SQL Editor');
    console.log('   3. Copy and paste the SQL from: scripts/add-email-column.sql');
    console.log('   4. Run the SQL script');
    console.log('   5. Then run: npm run nurses:create\n');
    
    console.log('📄 SQL to run:');
    console.log('─'.repeat(60));
    console.log(`
ALTER TABLE nurses 
ADD COLUMN IF NOT EXISTS email TEXT;

ALTER TABLE nurses 
ADD COLUMN IF NOT EXISTS auth_user_id UUID;

CREATE INDEX IF NOT EXISTS nurses_auth_user_id_idx ON nurses(auth_user_id) WHERE auth_user_id IS NOT NULL;
    `.trim());
    console.log('─'.repeat(60));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

addEmailColumn().catch(console.error);

