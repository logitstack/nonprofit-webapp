import React, { useState } from 'react';
import { Shield, Users, Package, Settings, Clock } from 'lucide-react';
import { db } from '../utils/database';  

const StaffLoginWall = ({ onLogin }) => {
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!loginForm.email || !loginForm.password) {
      setError('Please enter email and password');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const staffUser = await db.authenticateStaff(loginForm.email, loginForm.password);
      
      if (staffUser) {
        onLogin(staffUser);
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('Invalid credentials. Please check your email and password.');
    }
    
    setLoading(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleLogin();
    }
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-emerald-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <div className="h-8 w-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                <Users className="h-5 w-5 text-white" />
              </div>
              <div className="flex flex-col">
                <h1 className="text-xl font-bold text-gray-900">VolunteerHub</h1>
                <span className="text-xs text-gray-500">by DataCream</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">{formatTime(new Date())}</span>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-indigo-600" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Staff Login
              </h1>
              <p className="text-gray-600">
                Welcome to VolunteerHub
              </p>
            </div>

            <div className="space-y-4 mb-6">
              <input
                type="email"
                placeholder="Staff Email"
                value={loginForm.email}
                onChange={(e) => setLoginForm({...loginForm, email: e.target.value})}
                onKeyPress={handleKeyPress}
                className="w-full p-4 text-lg border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none"
                disabled={loading}
                autoFocus
              />
              
              <input
                type="password"
                placeholder="Staff Password"
                value={loginForm.password}
                onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                onKeyPress={handleKeyPress}
                className="w-full p-4 text-lg border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none"
                disabled={loading}
              />

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}
            </div>

            <button
              onClick={handleLogin}
              disabled={loading || !loginForm.email || !loginForm.password}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white text-xl font-semibold py-4 px-6 rounded-xl transition-colors flex items-center justify-center gap-3"
            >
              {loading ? (
                <div className="animate-spin h-6 w-6 border-2 border-white border-t-transparent rounded-full"></div>
              ) : (
                'Sign In'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaffLoginWall;