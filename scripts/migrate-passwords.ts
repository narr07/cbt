/**
 * Migration Script: Hash all plain text passwords in the database
 *
 * WARNING: Run this script only ONCE!
 * This will hash all passwords in the profiles table that are not already hashed.
 *
 * Usage:
 *   npx tsx scripts/migrate-passwords.ts
 */

import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!

async function migratePasswords() {
  console.log('🔐 Starting password migration...')

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

  // Fetch all profiles with passwords
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, username, password')
    .not('password', 'is', null)

  if (error) {
    console.error('❌ Error fetching profiles:', error)
    process.exit(1)
  }

  if (!profiles || profiles.length === 0) {
    console.log('ℹ️  No profiles found with passwords')
    return
  }

  console.log(`Found ${profiles.length} profiles with passwords`)

  let migrated = 0
  let skipped = 0
  let failed = 0

  for (const profile of profiles) {
    // Check if password is already hashed (bcrypt hashes start with $2a$, $2b$, or $2y$)
    const isAlreadyHashed = /^\$2[ayb]\$\d{2}\$/.test(profile.password)

    if (isAlreadyHashed) {
      console.log(`⏭️  Skipping ${profile.username || profile.id} (already hashed)`)
      skipped++
      continue
    }

    try {
      // Hash the plain text password
      const hashedPassword = await bcrypt.hash(profile.password, 10)

      // Update the database
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ password: hashedPassword })
        .eq('id', profile.id)

      if (updateError) {
        throw updateError
      }

      console.log(`✅ Migrated password for ${profile.username || profile.id}`)
      migrated++
    } catch (err) {
      console.error(`❌ Failed to migrate ${profile.username || profile.id}:`, err)
      failed++
    }
  }

  console.log('\n📊 Migration Summary:')
  console.log(`   ✅ Migrated: ${migrated}`)
  console.log(`   ⏭️  Skipped: ${skipped}`)
  console.log(`   ❌ Failed: ${failed}`)
  console.log(`   📝 Total: ${profiles.length}`)

  if (failed > 0) {
    console.log('\n⚠️  Some migrations failed. Please review the errors above.')
    process.exit(1)
  } else {
    console.log('\n🎉 Password migration completed successfully!')
  }
}

migratePasswords()
