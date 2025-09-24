import React, { useState, useEffect } from 'react';
import { Users, Package, Settings, Clock, Bell, Shield, LogOut } from 'lucide-react';
import DonorCheckin from './DonorCheckin';
import VolunteerCheckin from './VolunteerCheckin';
import StaffDashboard from './StaffDashboard';
import StaffLoginWall from './StaffLoginWall';
import { db } from '../utils/database';

const UnifiedApp = () => {
  const [currentInterface, setCurrentInterface] = useState('home');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [staffAuthenticated, setStaffAuthenticated] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Check existing authentication on load
  useEffect(() => {
    const checkExistingAuth = async () => {
      const currentStaff = await db.getCurrentStaffUser();
      setStaffAuthenticated(!!currentStaff);
      setCheckingAuth(false);
    };
    
    checkExistingAuth();
  }, []);

  // Logout handler
  const handleLogout = async () => {
    await db.logout();
    setStaffAuthenticated(false);
    setCurrentInterface('home');
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Show loading while checking authentication
  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-indigo-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  // Show login wall if not authenticated
  if (!staffAuthenticated) {
    return <StaffLoginWall onLogin={() => setStaffAuthenticated(true)} />;
  }

  // Home/Navigation Interface
  if (currentInterface === 'home') {
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
                <span className="text-sm text-gray-600">{formatTime(currentTime)}</span>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 text-red-600 hover:text-red-800 font-medium"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Welcome Section */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Welcome to VolunteerHub
            </h1>
            <p className="text-xl text-indigo-600 font-medium mb-2">by DataCream</p>
            <p className="text-lg text-gray-500 italic mb-4">Analytics made smooth.</p>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Your complete volunteer and donation management system. Whether you're volunteering your time or donating items, 
              every contribution makes a difference in our community.
            </p>
          </div>

          {/* Interface Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Volunteer Check-in */}
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden hover:shadow-2xl transition-shadow">
              <div className="bg-gradient-to-r from-emerald-500 to-green-600 p-6">
                <Users className="h-12 w-12 text-white mb-4" />
                <h2 className="text-2xl font-bold text-white mb-2">Volunteer Check-In</h2>
                <p className="text-emerald-100">
                  Sign up as a new volunteer or check in/out for your shift
                </p>
              </div>
              <div className="p-6">
                <ul className="space-y-2 text-gray-600 mb-6">
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                    Quick search and check-in
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                    New volunteer registration
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                    Digital waiver system
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                    Communication preferences
                  </li>
                </ul>
                <button
                  onClick={() => setCurrentInterface('volunteer')}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
                >
                  Volunteer Portal
                </button>
              </div>
            </div>

            {/* Donor Check-in */}
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden hover:shadow-2xl transition-shadow">
              <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-6">
                <Package className="h-12 w-12 text-white mb-4" />
                <h2 className="text-2xl font-bold text-white mb-2">Donor Check-In</h2>
                <p className="text-blue-100">
                  Register your clothing donations and track your impact
                </p>
              </div>
              <div className="p-6">
                <ul className="space-y-2 text-gray-600 mb-6">
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    Easy donation logging
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    Bag count tracking
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    New donor registration
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    Impact tracking
                  </li>
                </ul>
                <button
                  onClick={() => setCurrentInterface('donor')}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
                >
                  Donor Portal
                </button>
              </div>
            </div>

            {/* Staff Dashboard */}
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden hover:shadow-2xl transition-shadow">
              <div className="bg-gradient-to-r from-purple-500 to-pink-600 p-6">
                <Settings className="h-12 w-12 text-white mb-4" />
                <h2 className="text-2xl font-bold text-white mb-2">Staff Dashboard</h2>
                <p className="text-purple-100">
                  Manage users, view analytics, and configure system settings
                </p>
              </div>
              <div className="p-6">
                <ul className="space-y-2 text-gray-600 mb-6">
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    User management
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    Analytics & reports
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    Auto-checkout settings
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    Data export tools
                  </li>
                </ul>
                <button
                  onClick={() => setCurrentInterface('staff')}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
                >
                  Staff Portal
                </button>
              </div>
            </div>
          </div>

          {/* Features Overview */}
          <div className="mt-16 bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2 text-center">VolunteerHub Features</h2>
            <p className="text-center text-indigo-600 font-medium mb-6">Powered by DataCream Analytics</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="h-8 w-8 text-emerald-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Easy Check-In</h3>
                <p className="text-sm text-gray-600">
                  Quick check-in/out with red buttons for active volunteers
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Bell className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Communication</h3>
                <p className="text-sm text-gray-600">
                  Opt-in SMS/email for events and volunteer opportunities
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield className="h-8 w-8 text-yellow-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Digital Waivers</h3>
                <p className="text-sm text-gray-600">
                  Automated waiver system with parent/guardian support
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Clock className="h-8 w-8 text-purple-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Auto-Checkout</h3>
                <p className="text-sm text-gray-600">
                  Automatic checkout after office hours (managed by staff)
                </p>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-r from-emerald-500 to-green-600 rounded-xl p-6 text-white">
              <h3 className="text-lg font-semibold mb-2">Active Today</h3>
              <p className="text-3xl font-bold">12</p>
              <p className="text-emerald-100 text-sm">Volunteers currently checked in</p>
            </div>

            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl p-6 text-white">
              <h3 className="text-lg font-semibold mb-2">This Week</h3>
              <p className="text-3xl font-bold">248</p>
              <p className="text-blue-100 text-sm">Bags donated</p>
            </div>

            <div className="bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl p-6 text-white">
              <h3 className="text-lg font-semibold mb-2">This Month</h3>
              <p className="text-3xl font-bold">1,547</p>
              <p className="text-purple-100 text-sm">Volunteer hours logged</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Interface routing
  const renderInterface = () => {
    switch (currentInterface) {
      case 'volunteer':
        return <VolunteerCheckin onBack={() => setCurrentInterface('home')} />;
      case 'donor':
        return <DonorCheckin onBack={() => setCurrentInterface('home')} />;
      case 'staff':
        return <StaffDashboard onBack={() => setCurrentInterface('home')} />;
      default:
        return null;
    }
  };

  // Render the selected interface with back navigation
  if (currentInterface !== 'home') {
    return (
      <div className="min-h-screen">
        {/* Navigation Bar */}
        <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-14">
              <button
                onClick={() => setCurrentInterface('home')}
                className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 font-medium"
              >
                ← Back to Home
              </button>
              
              <div className="flex items-center gap-6">
                <button
                  onClick={() => setCurrentInterface('volunteer')}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                    currentInterface === 'volunteer' 
                      ? 'bg-emerald-100 text-emerald-800' 
                      : 'text-gray-600 hover:text-emerald-600'
                  }`}
                >
                  Volunteer
                </button>
                <button
                  onClick={() => setCurrentInterface('donor')}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                    currentInterface === 'donor' 
                      ? 'bg-blue-100 text-blue-800' 
                      : 'text-gray-600 hover:text-blue-600'
                  }`}
                >
                  Donor
                </button>
                <button
                  onClick={() => setCurrentInterface('staff')}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                    currentInterface === 'staff' 
                      ? 'bg-purple-100 text-purple-800' 
                      : 'text-gray-600 hover:text-purple-600'
                  }`}
                >
                  Staff
                </button>
              </div>

              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600">{formatTime(currentTime)}</span>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 text-red-600 hover:text-red-800 font-medium"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </div>
            </div>
          </div>
        </nav>

        {/* Interface Content */}
        {renderInterface()}
      </div>
    );
  }

  return null;
};

export default UnifiedApp;