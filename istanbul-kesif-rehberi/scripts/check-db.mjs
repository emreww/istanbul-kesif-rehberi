import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const envContent = fs.readFileSync('.env.local', 'utf-8')
const supabaseUrl = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)?.[1]?.trim()
const supabaseAnonKey = envContent.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)?.[1]?.trim()

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function main() {
  const { data: categories, error } = await supabase.from('categories').select('*').order('id')
  if (error) {
    console.error('Error fetching categories:', error)
    return
  }
  console.log('Existing Categories:', JSON.stringify(categories, null, 2))

  const { data: places } = await supabase.from('places').select('*').limit(1)
  console.log('Sample Full Place Record:', places?.[0])
}

main()
