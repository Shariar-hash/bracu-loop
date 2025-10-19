// Debug script to test Supabase Storage
import { supabase } from './src/lib/supabaseClient.ts';

async function testStorageAccess() {
  console.log('🧪 Testing Supabase Storage Access...');
  
  try {
    // Test 1: List buckets
    console.log('\n1️⃣ Testing bucket access...');
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    if (bucketsError) {
      console.error('❌ Cannot access buckets:', bucketsError);
      return;
    }
    console.log('✅ Available buckets:', buckets.map(b => b.name));
    
    // Test 2: Check student-notes bucket
    console.log('\n2️⃣ Testing student-notes bucket...');
    const { data: files, error: listError } = await supabase.storage
      .from('student-notes')
      .list('', { limit: 1 });
    
    if (listError) {
      console.error('❌ Cannot access student-notes bucket:', listError);
      return;
    }
    console.log('✅ student-notes bucket accessible');
    
    // Test 3: Check question-papers bucket
    console.log('\n3️⃣ Testing question-papers bucket...');
    const { data: qFiles, error: qListError } = await supabase.storage
      .from('question-papers')
      .list('', { limit: 1 });
    
    if (qListError) {
      console.error('❌ Cannot access question-papers bucket:', qListError);
      return;
    }
    console.log('✅ question-papers bucket accessible');
    
    // Test 4: Check authentication
    console.log('\n4️⃣ Testing authentication...');
    const { data: user, error: authError } = await supabase.auth.getUser();
    if (authError || !user.user) {
      console.error('❌ Authentication issue:', authError);
      return;
    }
    console.log('✅ User authenticated:', user.user.email);
    
    console.log('\n🎉 All storage tests passed!');
    
  } catch (error) {
    console.error('💥 Unexpected error:', error);
  }
}

testStorageAccess();