import { supabase } from '../lib/supabaseClient';

// Simple test to check Supabase connection and table access
export async function testDatabaseConnection() {
  console.log('🔍 Testing database connection...');
  
  try {
    // Test 1: Basic connection
    console.log('Test 1: Basic Supabase connection...');
    const { data: testData, error: testError } = await supabase.from('faculties').select('count');
    console.log('Basic connection result:', { testData, testError });
    
    // Test 2: Try to fetch faculties with minimal select
    console.log('\nTest 2: Fetching faculties...');
    const { data: facultiesData, error: facultiesError } = await supabase
      .from('faculties')
      .select('*');
    
    console.log('Faculties fetch result:', { 
      data: facultiesData, 
      error: facultiesError,
      count: facultiesData?.length 
    });
    
    // Test 3: Try to fetch courses
    console.log('\nTest 3: Fetching courses...');
    const { data: coursesData, error: coursesError } = await supabase
      .from('courses')
      .select('*');
      
    console.log('Courses fetch result:', { 
      data: coursesData, 
      error: coursesError,
      count: coursesData?.length 
    });
    
    // Test 4: Check table structure
    console.log('\nTest 4: Checking if tables exist...');
    const { data: tablesData, error: tablesError } = await supabase.rpc('exec_sql', {
      sql_query: `
        SELECT table_name, column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name IN ('courses', 'faculties')
        ORDER BY table_name, ordinal_position;
      `
    });
    
    console.log('Table structure result:', { tablesData, tablesError });
    
    return {
      success: !facultiesError && !coursesError,
      facultiesCount: facultiesData?.length || 0,
      coursesCount: coursesData?.length || 0,
      errors: { facultiesError, coursesError, tablesError }
    };
    
  } catch (error) {
    console.error('❌ Database test failed:', error);
    return { success: false, error };
  }
}

// Call this function in browser console to test
if (typeof window !== 'undefined') {
  (window as any).testDB = testDatabaseConnection;
  console.log('🚀 Run testDB() in browser console to test database connection');
}