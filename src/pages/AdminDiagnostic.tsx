import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle, Database, Shield, Settings } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

const AdminDiagnostic = () => {
  const [diagnostics, setDiagnostics] = useState({
    secureAuthFunction: null,
    adminTables: null,
    contactTables: null,
    oldAuthFunction: null
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    runDiagnostics();
  }, []);

  const runDiagnostics = async () => {
    setLoading(true);
    const results = { ...diagnostics };

    // Test 1: Check secure auth function
    try {
      const { data, error } = await supabase.rpc('authenticate_admin_secure', {
        username_input: 'test',
        password_input: 'test'
      });
      
      if (error && error.message.includes('function') && error.message.includes('does not exist')) {
        results.secureAuthFunction = false;
      } else {
        results.secureAuthFunction = true;
      }
    } catch (err) {
      results.secureAuthFunction = false;
    }

    // Test 2: Check admin tables
    try {
      const { data, error } = await supabase
        .from('admin_users')
        .select('username')
        .limit(1);
      results.adminTables = !error;
    } catch (err) {
      results.adminTables = false;
    }

    // Test 3: Check contact tables
    try {
      const { data, error } = await supabase
        .from('admin_contact_submissions')
        .select('id')
        .limit(1);
      results.contactTables = !error;
    } catch (err) {
      results.contactTables = false;
    }

    // Test 4: Check old auth function
    try {
      const { data, error } = await supabase.rpc('authenticate_admin', {
        username_input: 'test',
        password_input: 'test'
      });
      
      if (error && error.message.includes('function') && error.message.includes('does not exist')) {
        results.oldAuthFunction = false;
      } else {
        results.oldAuthFunction = true;
      }
    } catch (err) {
      results.oldAuthFunction = false;
    }

    setDiagnostics(results);
    setLoading(false);
  };

  const DiagnosticItem = ({ title, status, description, solution }) => (
    <div className="flex items-start gap-3 p-4 border rounded-lg">
      {status === true ? (
        <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
      ) : status === false ? (
        <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
      ) : (
        <div className="w-5 h-5 bg-gray-300 rounded-full mt-0.5 animate-pulse"></div>
      )}
      <div className="flex-1">
        <h4 className="font-medium text-gray-900">{title}</h4>
        <p className="text-sm text-gray-600 mt-1">{description}</p>
        {status === false && solution && (
          <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
            <p className="text-sm text-yellow-800">{solution}</p>
          </div>
        )}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p>Running diagnostics...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <Card className="mb-6">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <Shield className="w-6 h-6 text-blue-600" />
            </div>
            <CardTitle className="text-2xl">Admin Dashboard Diagnostic</CardTitle>
            <p className="text-gray-600">Checking system configuration and requirements</p>
          </CardHeader>
        </Card>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                Database Functions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <DiagnosticItem
                title="Secure Authentication Function"
                status={diagnostics.secureAuthFunction}
                description="authenticate_admin_secure() function for secure login"
                solution="Run SECURE_ADMIN_AUTH.sql in Supabase SQL Editor"
              />
              <DiagnosticItem
                title="Legacy Authentication Function"
                status={diagnostics.oldAuthFunction}
                description="Old authenticate_admin() function (should be replaced)"
                solution={diagnostics.oldAuthFunction ? "This function exists but should be replaced with secure version" : null}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Database Tables
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <DiagnosticItem
                title="Admin Users Table"
                status={diagnostics.adminTables}
                description="admin_users table for authentication"
                solution="Run admin setup SQL to create admin_users table"
              />
              <DiagnosticItem
                title="Contact Form Tables"
                status={diagnostics.contactTables}
                description="admin_contact_submissions table for contact forms"
                solution="Run CONTACT_FORM_SYSTEM.sql in Supabase SQL Editor"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Setup Instructions</CardTitle>
            </CardHeader>
            <CardContent>
              {!diagnostics.secureAuthFunction ? (
                <div className="space-y-4">
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <h4 className="font-medium text-red-800 mb-2">🚨 Critical: Secure Authentication Missing</h4>
                    <p className="text-sm text-red-700 mb-3">
                      The admin dashboard is blank because the secure authentication system hasn't been installed.
                    </p>
                    <div className="text-sm text-red-800">
                      <p className="font-medium mb-2">Required Steps:</p>
                      <ol className="list-decimal ml-4 space-y-1">
                        <li>Open Supabase SQL Editor</li>
                        <li>Copy and run SECURE_ADMIN_AUTH.sql</li>
                        <li>Copy and run CONTACT_FORM_SYSTEM.sql</li>
                        <li>Set up your admin password</li>
                        <li>Refresh this page</li>
                      </ol>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h4 className="font-medium text-green-800 mb-2">✅ System Ready</h4>
                  <p className="text-sm text-green-700">
                    All required components are installed. The admin dashboard should work properly.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button onClick={runDiagnostics} className="flex-1">
              Re-run Diagnostics
            </Button>
            {diagnostics.secureAuthFunction && (
              <Button 
                onClick={() => window.location.href = '/admin/dashboard'} 
                className="flex-1"
                variant="default"
              >
                Go to Admin Dashboard
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDiagnostic;