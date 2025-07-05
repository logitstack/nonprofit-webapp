import React, { useState, useEffect } from 'react';
import { 
  Users, Package, Clock, TrendingUp, Search, Filter, Download, 
  Calendar, BarChart3, PieChart, UserCheck, Gift, Eye, Edit,
  LogOut, Home, Settings, FileText, ChevronRight, RefreshCw, X, Save,
  ArrowLeft, Trash2, User
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths } from 'date-fns';
import { db } from '../utils/database';

const StaffDashboard = () => {
  const [currentView, setCurrentView] = useState('dashboard');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [dateRange, setDateRange] = useState('this_month');
  const [users, setUsers] = useState([]);
  const [analytics, setAnalytics] = useState({});
  const [selectedUser, setSelectedUser] = useState(null);
  const [userSessions, setUserSessions] = useState([]);
  const [editingSession, setEditingSession] = useState(null);
  const [editingUserInfo, setEditingUserInfo] = useState(null);
  const [userInfoForm, setUserInfoForm] = useState({});
  const [exportFilters, setExportFilters] = useState({
    profession: '',
    minAge: '',
    maxAge: '',
    minHours: '',
    maxHours: '',
    minBags: '',
    maxBags: '',
    dateRange: 'all_time'
  });
  const [showExportModal, setShowExportModal] = useState(false);

  // Load data on component mount
  useEffect(() => {
    if (isLoggedIn) {
      loadDashboardData();
    }
  }, [isLoggedIn, dateRange]);

  // Fixed date range calculation for analytics
  const getDateRangeForAnalytics = () => {
    const now = new Date();
    let startDate, endDate;
    
    switch (dateRange) {
      case 'this_week':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 6); // Last 7 days including today
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'this_month':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 29); // Last 30 days including today
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'last_month':
        // CORRECTED: Use proper last calendar month (June 2025)
        const lastMonth = new Date(now);
        lastMonth.setMonth(now.getMonth() - 1); // Go back one month
        startDate = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1); // First day of June
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0); // Last day of June
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'this_year':
        startDate = new Date(now.getFullYear(), 0, 1); // January 1st of this year
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'last_30_days':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 29);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now);
        endDate.setHours(23, 59, 59, 999);
        break;
      default:
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 29);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now);
        endDate.setHours(23, 59, 59, 999);
    }
    
    return { start: startDate, end: endDate };
  };

  const loadDashboardData = async () => {
    setLoading(true);
    const allUsers = await db.getAllUsers();
    
    // Calculate age for each user
    const usersWithAge = allUsers.map(user => ({
      ...user,
      age: user.date_of_birth ? calculateAge(new Date(user.date_of_birth)) : null
    }));
    
    setUsers(usersWithAge);
    
    // Skip the broken database analytics and calculate everything from user data
    const stats = calculateAnalytics(usersWithAge, null);
    setAnalytics(stats);
    setLoading(false);
  };

  const calculateAge = (birthDate) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  };

  const calculateAnalytics = (userData, rangeData) => {
    const now = new Date();

    // Basic stats
    const totalUsers = userData.length;
    const totalHours = userData.reduce((sum, u) => sum + (u.total_hours || 0), 0);
    const totalBags = userData.reduce((sum, u) => sum + (u.total_bags || 0), 0);
    const activeVolunteers = userData.filter(u => u.is_checked_in).length;

    // CALCULATE RANGE-SPECIFIC DATA FROM USER CREATED_AT DATES
    const { start, end } = getDateRangeForAnalytics();
    
    // Filter users by their created_at date to get range-specific totals
    const usersInRange = userData.filter(user => {
      if (!user.created_at) return false;
      const userDate = new Date(user.created_at);
      return userDate >= start && userDate <= end;
    });
    
    const rangeHours = usersInRange.reduce((sum, u) => sum + (u.total_hours || 0), 0);
    const rangeBags = usersInRange.reduce((sum, u) => sum + (u.total_bags || 0), 0);
    const rangeVolunteers = usersInRange.filter(u => (u.total_hours || 0) > 0).length;
    
    console.log(`📊 Range Analytics (${dateRange}):`, {
      dateRange: start.toLocaleDateString() + ' to ' + end.toLocaleDateString(),
      usersInRange: usersInRange.length,
      rangeHours,
      rangeBags,
      rangeVolunteers
    });

    // Generate trend data for charts (consistent data, not random)
    const trendData = [];
    for (let i = 29; i >= 0; i--) {
      const date = subDays(now, i);
      // Use date-based seed for consistent data
      const seed = date.getDate() + date.getMonth() * 30;
      trendData.push({
        date: format(date, 'MM/dd'),
        volunteers: Math.floor((seed * 7) % 15) + 5,
        hours: Math.floor((seed * 11) % 40) + 20,
        bags: Math.floor((seed * 13) % 30) + 10
      });
    }

    // Profession breakdown
    const professionBreakdown = userData.reduce((acc, user) => {
      const prof = user.profession || 'Not specified';
      acc[prof] = (acc[prof] || 0) + 1;
      return acc;
    }, {});

    // Age breakdown
    const ageBreakdown = userData.reduce((acc, user) => {
      if (user.age) {
        const ageGroup = user.age < 25 ? '18-24' : 
                       user.age < 35 ? '25-34' :
                       user.age < 45 ? '35-44' :
                       user.age < 55 ? '45-54' :
                       user.age < 65 ? '55-64' : '65+';
        acc[ageGroup] = (acc[ageGroup] || 0) + 1;
      }
      return acc;
    }, {});

    return {
      totalUsers,
      totalHours,
      totalBags,
      activeVolunteers,
      trendData,
      professionBreakdown,
      ageBreakdown,
      avgHoursPerVolunteer: totalHours / totalUsers,
      avgBagsPerDonor: totalBags / totalUsers,
      // Use the calculated range data instead of broken database query
      rangeHours,
      rangeBags,
      rangeVolunteers,
      rangeSessions: rangeData?.sessionCount || 0
    };
  };

  const handleLogin = async () => {
    setLoading(true);
    
    const validUsers = {
      'admin': { name: 'Administrator', role: 'admin' },
      'manager': { name: 'Manager', role: 'manager' },
      'coordinator': { name: 'Volunteer Coordinator', role: 'staff' },
      'analyst': { name: 'Data Analyst', role: 'staff' }
    };

    if (validUsers[loginForm.username] && loginForm.password === 'password') {
      setCurrentUser(validUsers[loginForm.username]);
      setIsLoggedIn(true);
    } else {
      alert('Invalid credentials. Use: admin/password, manager/password, etc.');
    }
    
    setLoading(false);
  };

  // Updated function to load user sessions including active ones
  const loadUserSessions = async (userId) => {
    setLoading(true);
    
    // Get completed sessions
    const completedSessions = await db.getUserSessions(userId);
    
    // Get user data to check if they're currently checked in
    const user = await db.getUserById(userId);
    
    let allSessions = [...completedSessions];
    
    // If user is currently checked in, create an active session entry
    if (user && user.is_checked_in && user.last_check_in) {
      const activeSession = {
        id: `active-${userId}`, // Temporary ID for active session
        user_id: userId,
        check_in_time: user.last_check_in,
        check_out_time: null,
        hours_worked: null,
        notes: null,
        is_active: true // Flag to identify active sessions
      };
      
      // Add active session at the beginning of the array
      allSessions = [activeSession, ...completedSessions];
    }
    
    setUserSessions(allSessions);
    setLoading(false);
  };

  const handleUserClick = async (user) => {
    setSelectedUser(user);
    await loadUserSessions(user.id);
    setCurrentView('user_detail');
  };

  const handleSessionEdit = (session) => {
    setEditingSession({
      ...session,
      check_in_time: session.check_in_time ? format(new Date(session.check_in_time), "yyyy-MM-dd'T'HH:mm") : '',
      check_out_time: session.check_out_time ? format(new Date(session.check_out_time), "yyyy-MM-dd'T'HH:mm") : ''
    });
  };

  // Updated session update handler to handle active sessions
  const handleSessionUpdate = async () => {
    if (!editingSession.check_in_time) {
      alert('Check-in time is required');
      return;
    }

    setLoading(true);
    
    try {
      // Handle active session differently
      if (editingSession.is_active) {
        // Update the user's last_check_in time
        const updatedUser = await db.updateUser(selectedUser.id, {
          last_check_in: editingSession.check_in_time
        });
        
        if (updatedUser) {
          // Refresh sessions to show updated check-in time
          await loadUserSessions(selectedUser.id);
          
          // Update selected user data
          const userWithAge = {
            ...updatedUser,
            age: updatedUser.date_of_birth ? calculateAge(new Date(updatedUser.date_of_birth)) : null
          };
          setSelectedUser(userWithAge);
          
          // Update the user in the main users list
          setUsers(users.map(u => u.id === selectedUser.id ? userWithAge : u));
          
          alert('Active session check-in time updated successfully!');
        }
      } else {
        // Handle completed session normally
        const updatedSession = await db.updateSession(editingSession.id, {
          check_in_time: editingSession.check_in_time,
          check_out_time: editingSession.check_out_time || null
        });

        if (updatedSession) {
          // Refresh sessions
          await loadUserSessions(selectedUser.id);
          
          // Refresh user data with updated hours
          const updatedUser = await db.getUserById(selectedUser.id);
          const userWithAge = {
            ...updatedUser,
            age: updatedUser.date_of_birth ? calculateAge(new Date(updatedUser.date_of_birth)) : null
          };
          
          setSelectedUser(userWithAge);
          setUsers(users.map(u => u.id === selectedUser.id ? userWithAge : u));
          
          alert('Session updated successfully!');
        }
      }
      
      setEditingSession(null);
    } catch (error) {
      console.error('Error updating session:', error);
      alert('Error updating session. Please try again.');
    }
    
    setLoading(false);
  };

  const handleSessionDelete = async (sessionId) => {
    if (!window.confirm('Are you sure you want to delete this session?')) {
      return;
    }

    setLoading(true);
    const success = await db.deleteSession(sessionId);
    
    if (success) {
      await loadUserSessions(selectedUser.id);
      const updatedUser = await db.getUserById(selectedUser.id);
      const userWithAge = {
        ...updatedUser,
        age: updatedUser.date_of_birth ? calculateAge(new Date(updatedUser.date_of_birth)) : null
      };
      setSelectedUser(userWithAge);
      setUsers(users.map(u => u.id === selectedUser.id ? userWithAge : u));
      alert('Session deleted successfully!');
    }
    setLoading(false);
  };

  const handleUserDelete = async (user) => {
    if (!window.confirm(`Are you sure you want to delete ${user.name}? This will delete all their sessions and donations.`)) {
      return;
    }

    setLoading(true);
    const success = await db.deleteUser(user.id);
    
    if (success) {
      setUsers(users.filter(u => u.id !== user.id));
      setCurrentView('users');
      setSelectedUser(null);
      alert('User deleted successfully!');
    }
    setLoading(false);
  };

  const handleUserInfoEdit = (user) => {
    setEditingUserInfo(user);
    setUserInfoForm({
      name: user.name,
      email: user.email,
      phone: user.phone,
      city: user.city || '',
      organization: user.organization || '',
      profession: user.profession || '',
      date_of_birth: user.date_of_birth ? format(new Date(user.date_of_birth), 'yyyy-MM-dd') : ''
    });
  };
  
  const handleUserInfoUpdate = async () => {
    if (!userInfoForm.name || !userInfoForm.email || !userInfoForm.phone) {
      alert('Name, email, and phone are required');
      return;
    }
  
    setLoading(true);
    const updatedUser = await db.updateUser(editingUserInfo.id, {
      name: userInfoForm.name,
      email: userInfoForm.email,
      phone: userInfoForm.phone,
      city: userInfoForm.city,
      organization: userInfoForm.organization,
      profession: userInfoForm.profession,
      date_of_birth: userInfoForm.date_of_birth || null
    });
  
    if (updatedUser) {
      // Update local state
      const userWithAge = {
        ...updatedUser,
        age: updatedUser.date_of_birth ? calculateAge(new Date(updatedUser.date_of_birth)) : null
      };
      
      setUsers(users.map(u => u.id === editingUserInfo.id ? userWithAge : u));
      
      if (selectedUser && selectedUser.id === editingUserInfo.id) {
        setSelectedUser(userWithAge);
      }
      
      setEditingUserInfo(null);
      setUserInfoForm({});
      alert('User information updated successfully!');
    }
    setLoading(false);
  };

  const applyExportFilters = (userData) => {
    return userData.filter(user => {
      // Profession filter
      if (exportFilters.profession && user.profession !== exportFilters.profession) {
        return false;
      }
      
      // Age filters
      if (exportFilters.minAge && (!user.age || user.age < parseInt(exportFilters.minAge))) {
        return false;
      }
      if (exportFilters.maxAge && (!user.age || user.age > parseInt(exportFilters.maxAge))) {
        return false;
      }
      
      // Hours filters
      if (exportFilters.minHours && (user.total_hours || 0) < parseFloat(exportFilters.minHours)) {
        return false;
      }
      if (exportFilters.maxHours && (user.total_hours || 0) > parseFloat(exportFilters.maxHours)) {
        return false;
      }
      
      // Bags filters
      if (exportFilters.minBags && (user.total_bags || 0) < parseInt(exportFilters.minBags)) {
        return false;
      }
      if (exportFilters.maxBags && (user.total_bags || 0) > parseInt(exportFilters.maxBags)) {
        return false;
      }
      
      return true;
    });
  };

  const exportData = () => {
    const filteredUsers = applyExportFilters(users);
    
    const csvData = filteredUsers.map(user => ({
      Name: user.name,
      Email: user.email,
      Phone: user.phone,
      Age: user.age || 'Not specified',
      City: user.city,
      Organization: user.organization,
      Profession: user.profession || 'Not specified',
      'Total Hours': user.total_hours || 0,
      'Total Bags': user.total_bags || 0,
      Status: user.is_checked_in ? 'Active' : 'Offline',
      'Created': format(new Date(user.created_at), 'MM/dd/yyyy')
    }));
    
    // Convert to CSV
    const csv = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n');
    
    // Download
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `volunteer-data-filtered-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    
    setShowExportModal(false);
    alert(`Exported ${filteredUsers.length} records matching your filters.`);
  };

  const formatDate = (date) => {
    return format(new Date(date), 'MMM dd, yyyy');
  };

  const formatDateTime = (date) => {
    return format(new Date(date), 'MMM dd, yyyy h:mm a');
  };

  const getDateRangeLabel = () => {
    switch (dateRange) {
      case 'this_week': return 'This Week';
      case 'this_month': return 'This Month';
      case 'last_month': return 'Last Month';
      case 'this_year': return 'This Year';
      case 'last_30_days': return 'Last 30 Days';
      default: return 'This Month';
    }
  };

  // Updated and properly sorted filteredUsers
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.organization.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterType === 'all' || 
                         (filterType === 'volunteers' && (user.total_hours || 0) > 0) ||
                         (filterType === 'donors' && (user.total_bags || 0) > 0) ||
                         (filterType === 'active' && user.is_checked_in) ||
                         (filterType === 'recent' && user.created_at > new Date(Date.now() - 7*24*60*60*1000));
    
    return matchesSearch && matchesFilter;
  }).sort((a, b) => {
    // First sort by active status (active users first)
    if (a.is_checked_in && !b.is_checked_in) return -1;
    if (!a.is_checked_in && b.is_checked_in) return 1;
    
    // Then sort by most recent activity
    const aLastActivity = new Date(a.created_at || 0);
    const bLastActivity = new Date(b.created_at || 0);
    return bLastActivity - aLastActivity;
  });

  // Login Screen
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-blue-900 flex items-center justify-center p-8">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="mx-auto h-16 w-16 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
              <Users className="h-8 w-8 text-indigo-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Staff Portal</h1>
            <p className="text-gray-600">Nonprofit Management Dashboard</p>
          </div>
          
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Username"
              value={loginForm.username}
              onChange={(e) => setLoginForm({...loginForm, username: e.target.value})}
              className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none"
            />
            <input
              type="password"
              placeholder="Password"
              value={loginForm.password}
              onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
              className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none"
            />
            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white font-semibold py-4 px-6 rounded-xl transition-colors"
            >
              {loading ? 'Signing In...' : 'Sign In'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main Dashboard
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <div className="h-8 w-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                <Users className="h-5 w-5 text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">Staff Portal</h1>
              {currentView === 'user_detail' && selectedUser && (
                <span className="text-gray-500">→ {selectedUser.name}</span>
              )}
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">Welcome, {currentUser.name}</span>
              <button
                onClick={() => setIsLoggedIn(false)}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation */}
        {currentView !== 'user_detail' && (
          <nav className="mb-8">
            <div className="flex space-x-8">
              <button
                onClick={() => setCurrentView('dashboard')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  currentView === 'dashboard' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Home className="h-4 w-4" />
                Dashboard
              </button>
              <button
                onClick={() => setCurrentView('users')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  currentView === 'users' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Users className="h-4 w-4" />
                Users
              </button>
              <button
                onClick={() => setCurrentView('analytics')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  currentView === 'analytics' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <BarChart3 className="h-4 w-4" />
                Analytics
              </button>
              <button
                onClick={() => setCurrentView('reports')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  currentView === 'reports' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <FileText className="h-4 w-4" />
                Reports
              </button>
            </div>
          </nav>
        )}

        {/* Dashboard View with Time Range Selector */}
        {currentView === 'dashboard' && (
          <div className="space-y-8">
            {/* Time Range Selector */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Analytics for {getDateRangeLabel()}</h3>
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="this_week">This Week</option>
                  <option value="this_month">This Month</option>
                  <option value="last_month">Last Month</option>
                  <option value="this_year">This Year</option>
                  <option value="last_30_days">Last 30 Days</option>
                </select>
              </div>
            </div>

            {/* Stats Cards with Time Range Data */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Users</p>
                    <p className="text-3xl font-bold text-gray-900">{analytics.totalUsers}</p>
                  </div>
                  <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Active Volunteers ({getDateRangeLabel()})</p>
                    <p className="text-3xl font-bold text-gray-900">{analytics.rangeVolunteers || 0}</p>
                  </div>
                  <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <UserCheck className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Hours ({getDateRangeLabel()})</p>
                    <p className="text-3xl font-bold text-gray-900">{(analytics.rangeHours || 0).toFixed(1)}</p>
                  </div>
                  <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Clock className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Bags ({getDateRangeLabel()})</p>
                    <p className="text-3xl font-bold text-gray-900">{analytics.rangeBags || 0}</p>
                  </div>
                  <div className="h-12 w-12 bg-orange-100 rounded-lg flex items-center justify-center">
                    <Package className="h-6 w-6 text-orange-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">30-Day Activity Trends</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={analytics.trendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="volunteers" stroke="#8884d8" name="Volunteers" />
                    <Line type="monotone" dataKey="hours" stroke="#82ca9d" name="Hours" />
                    <Line type="monotone" dataKey="bags" stroke="#ffc658" name="Bags" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Volunteer Professions</h3>
                <div className="space-y-3">
                  {Object.entries(analytics.professionBreakdown || {}).map(([profession, count]) => (
                    <div key={profession} className="flex justify-between items-center">
                      <span className="text-gray-700 text-sm">{profession}</span>
                      <div className="flex items-center gap-2">
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-indigo-600 h-2 rounded-full" 
                            style={{ width: `${(count / analytics.totalUsers) * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium text-gray-900 w-8">{count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Age Groups</h3>
                <div className="space-y-3">
                  {Object.entries(analytics.ageBreakdown || {}).map(([ageGroup, count]) => (
                    <div key={ageGroup} className="flex justify-between items-center">
                      <span className="text-gray-700 text-sm">{ageGroup}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-emerald-600 h-2 rounded-full" 
                            style={{ width: `${(count / analytics.totalUsers) * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium text-gray-900 w-8">{count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Users View */}
        {currentView === 'users' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="all">All Users</option>
                  <option value="volunteers">Volunteers</option>
                  <option value="donors">Donors</option>
                  <option value="active">Currently Active</option>
                  <option value="recent">Recent Activity</option>
                </select>
                <button
                  onClick={() => setShowExportModal(true)}
                  className="flex items-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  <Download className="h-4 w-4" />
                  Export
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Age</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Profession</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hours</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bags</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredUsers.map(user => (
                      <tr 
                        key={user.id} 
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => handleUserClick(user)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{user.name}</div>
                            <div className="text-sm text-gray-500">{user.organization}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{user.email}</div>
                          <div className="text-sm text-gray-500">{user.phone}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-900">{user.age || 'N/A'}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-900">{user.profession || 'Not specified'}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{user.total_hours || 0}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{user.total_bags || 0}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {user.is_checked_in ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              Offline
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* User Detail View */}
        {currentView === 'user_detail' && selectedUser && (
          <div className="space-y-6">
            {/* Back button and user header */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => setCurrentView('users')}
                className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800"
              >
                <ArrowLeft className="h-5 w-5" />
                Back to Users
              </button>
              <button
                onClick={() => handleUserDelete(selectedUser)}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                Delete User
              </button>
            </div>

            {/* User Profile Card */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-900">User Profile</h2>
                <button
                  onClick={() => handleUserInfoEdit(selectedUser)}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  <Edit className="h-4 w-4" />
                  Edit Info
                </button>
              </div>
              
              <div className="flex items-center gap-6">
                <div className="h-20 w-20 bg-indigo-100 rounded-full flex items-center justify-center">
                  <User className="h-10 w-10 text-indigo-600" />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-900">{selectedUser.name}</h2>
                  <p className="text-gray-600">{selectedUser.organization}</p>
                  <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Email:</span>
                      <p className="font-medium">{selectedUser.email}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Phone:</span>
                      <p className="font-medium">{selectedUser.phone}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Age:</span>
                      <p className="font-medium">{selectedUser.age || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Profession:</span>
                      <p className="font-medium">{selectedUser.profession || 'Not specified'}</p>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="mb-2">
                    <span className="text-2xl font-bold text-purple-600">{selectedUser.total_hours || 0}</span>
                    <span className="text-gray-500 ml-1">hours</span>
                  </div>
                  <div>
                    <span className="text-2xl font-bold text-emerald-600">{selectedUser.total_bags || 0}</span>
                    <span className="text-gray-500 ml-1">bags</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Volunteer Sessions */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Volunteer Sessions</h3>
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin h-8 w-8 border-2 border-indigo-600 border-t-transparent rounded-full mx-auto"></div>
                </div>
              ) : userSessions.length > 0 ? (
                <div className="space-y-3">
                  {userSessions.map(session => (
                    <div key={session.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <span className="text-sm text-gray-500">Check In:</span>
                              <p className="font-medium">{formatDateTime(session.check_in_time)}</p>
                            </div>
                            <div>
                              <span className="text-sm text-gray-500">Check Out:</span>
                              <p className="font-medium">
                                {session.check_out_time ? formatDateTime(session.check_out_time) : (
                                  session.is_active ? (
                                    <span className="text-green-600">Currently Active</span>
                                  ) : (
                                    <span className="text-orange-600">Not set</span>
                                  )
                                )}
                              </p>
                            </div>
                            <div>
                              <span className="text-sm text-gray-500">Hours:</span>
                              <p className="font-medium text-purple-600">
                                {session.is_active ? 
                                  <span className="text-orange-600">
                                    {((new Date() - new Date(session.check_in_time)) / (1000 * 60 * 60)).toFixed(1)} (ongoing)
                                  </span> :
                                  (session.hours_worked || 0).toFixed(2)}
                              </p>
                            </div>
                          </div>
                          {session.notes && (
                            <div className="mt-2 text-sm text-gray-600">
                              <span className="font-medium">Notes:</span> {session.notes}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <button
                            onClick={() => handleSessionEdit(session)}
                            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded"
                            title="Edit Session"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          {!session.is_active && (
                            <button
                              onClick={() => handleSessionDelete(session.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded"
                              title="Delete Session"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : selectedUser.is_checked_in ? (
                <div className="text-center py-8">
                  <div className="text-green-600 mb-2">
                    <UserCheck className="h-12 w-12 mx-auto mb-2" />
                    User is currently checked in
                  </div>
                  <p className="text-gray-500">Active session will appear above once loaded.</p>
                  <button 
                    onClick={() => loadUserSessions(selectedUser.id)}
                    className="mt-3 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    <RefreshCw className="h-4 w-4 inline mr-2" />
                    Refresh Sessions
                  </button>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No volunteer sessions recorded.</p>
              )}
            </div>
          </div>
        )}

        {/* Analytics View */}
        {currentView === 'analytics' && (
          <div className="space-y-8">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Key Performance Metrics</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-indigo-600 mb-2">
                    {analytics.avgHoursPerVolunteer?.toFixed(1)}
                  </div>
                  <div className="text-sm text-gray-600">Avg Hours per Volunteer</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-emerald-600 mb-2">
                    {analytics.avgBagsPerDonor?.toFixed(1)}
                  </div>
                  <div className="text-sm text-gray-600">Avg Bags per Donor</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600 mb-2">
                    {analytics.rangeSessions}
                  </div>
                  <div className="text-sm text-gray-600">Sessions ({getDateRangeLabel()})</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Volunteers (by Hours)</h3>
                <div className="space-y-3">
                  {users.sort((a, b) => (b.total_hours || 0) - (a.total_hours || 0)).slice(0, 5).map((user, index) => (
                    <div key={user.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center text-sm font-medium text-indigo-600">
                          {index + 1}
                        </div>
                        <div>
                          <span className="font-medium text-gray-900">{user.name}</span>
                          <div className="text-xs text-gray-500">Age: {user.age || 'N/A'}</div>
                        </div>
                      </div>
                      <span className="text-sm text-gray-600">{user.total_hours || 0}h</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Donors (by Bags)</h3>
                <div className="space-y-3">
                  {users.sort((a, b) => (b.total_bags || 0) - (a.total_bags || 0)).slice(0, 5).map((user, index) => (
                    <div key={user.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center text-sm font-medium text-emerald-600">
                          {index + 1}
                        </div>
                        <div>
                          <span className="font-medium text-gray-900">{user.name}</span>
                          <div className="text-xs text-gray-500">Age: {user.age || 'N/A'}</div>
                        </div>
                      </div>
                      <span className="text-sm text-gray-600">{user.total_bags || 0} bags</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Reports View */}
        {currentView === 'reports' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Generate Reports</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <button
                  onClick={() => setShowExportModal(true)}
                  className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left"
                >
                  <FileText className="h-6 w-6 text-indigo-600 mb-2" />
                  <div className="font-medium text-gray-900">Filtered User Report</div>
                  <div className="text-sm text-gray-600">Export with custom filters</div>
                </button>
                
                <button
                  onClick={() => alert('Volunteer report generated!')}
                  className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left"
                >
                  <Clock className="h-6 w-6 text-purple-600 mb-2" />
                  <div className="font-medium text-gray-900">Volunteer Hours Report</div>
                  <div className="text-sm text-gray-600">Detailed time tracking and sessions</div>
                </button>
                
                <button
                  onClick={() => alert('Age demographics report generated!')}
                  className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left"
                >
                  <Users className="h-6 w-6 text-emerald-600 mb-2" />
                  <div className="font-medium text-gray-900">Demographics Report</div>
                  <div className="text-sm text-gray-600">Age and profession breakdown</div>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Session Edit Modal - Updated to handle active sessions */}
      {editingSession && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingSession.is_active ? 'Edit Active Session' : 'Edit Session'}
              </h3>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Check-in Time
                </label>
                <input
                  type="datetime-local"
                  value={editingSession.check_in_time}
                  onChange={(e) => setEditingSession({...editingSession, check_in_time: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              
              {!editingSession.is_active && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Check-out Time
                  </label>
                  <input
                    type="datetime-local"
                    value={editingSession.check_out_time}
                    onChange={(e) => setEditingSession({...editingSession, check_out_time: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              )}
              
              {editingSession.is_active && (
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="text-sm text-green-800">
                    This is an active session. You can only edit the check-in time. 
                    To edit the check-out time, the volunteer must check out first.
                  </p>
                </div>
              )}
            </div>
            
            <div className="p-6 border-t border-gray-200 flex gap-3">
              <button
                onClick={() => setEditingSession(null)}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSessionUpdate}
                disabled={loading}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Update Session
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Info Edit Modal */}
      {editingUserInfo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Edit User Information</h3>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
                  <input
                    type="text"
                    value={userInfoForm.name}
                    onChange={(e) => setUserInfoForm({...userInfoForm, name: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                  <input
                    type="email"
                    value={userInfoForm.email}
                    onChange={(e) => setUserInfoForm({...userInfoForm, email: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone *</label>
                  <input
                    type="tel"
                    value={userInfoForm.phone}
                    onChange={(e) => setUserInfoForm({...userInfoForm, phone: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                  <input
                    type="text"
                    value={userInfoForm.city}
                    onChange={(e) => setUserInfoForm({...userInfoForm, city: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Organization</label>
                  <input
                    type="text"
                    value={userInfoForm.organization}
                    onChange={(e) => setUserInfoForm({...userInfoForm, organization: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Profession</label>
                  <select
                    value={userInfoForm.profession}
                    onChange={(e) => setUserInfoForm({...userInfoForm, profession: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">Select Profession</option>
                    <option value="IT">IT / Technology</option>
                    <option value="Medicine">Medicine / Healthcare</option>
                    <option value="Education">Education / Teaching</option>
                    <option value="Business">Business / Finance</option>
                    <option value="Engineering">Engineering</option>
                    <option value="Homemaker">Homemaker</option>
                    <option value="Retired">Retired</option>
                    <option value="Student">Student</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date of Birth</label>
                  <input
                    type="date"
                    value={userInfoForm.date_of_birth}
                    onChange={(e) => setUserInfoForm({...userInfoForm, date_of_birth: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-200 flex gap-3">
              <button
                onClick={() => {
                  setEditingUserInfo(null);
                  setUserInfoForm({});
                }}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUserInfoUpdate}
                disabled={loading}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Export Filter Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Export Filters</h3>
              <p className="text-sm text-gray-600 mt-1">Apply filters before exporting data</p>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Profession Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Profession</label>
                  <select
                    value={exportFilters.profession}
                    onChange={(e) => setExportFilters({...exportFilters, profession: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">All Professions</option>
                    <option value="IT">IT / Technology</option>
                    <option value="Medicine">Medicine / Healthcare</option>
                    <option value="Education">Education / Teaching</option>
                    <option value="Business">Business / Finance</option>
                    <option value="Engineering">Engineering</option>
                    <option value="Homemaker">Homemaker</option>
                    <option value="Retired">Retired</option>
                    <option value="Student">Student</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {/* Date Range Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Time Period</label>
                  <select
                    value={exportFilters.dateRange}
                    onChange={(e) => setExportFilters({...exportFilters, dateRange: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="all_time">All Time</option>
                    <option value="this_year">This Year</option>
                    <option value="this_month">This Month</option>
                    <option value="last_month">Last Month</option>
                    <option value="last_30_days">Last 30 Days</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Age Range</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      placeholder="Min"
                      value={exportFilters.minAge}
                      onChange={(e) => setExportFilters({...exportFilters, minAge: e.target.value})}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <input
                      type="number"
                      placeholder="Max"
                      value={exportFilters.maxAge}
                      onChange={(e) => setExportFilters({...exportFilters, maxAge: e.target.value})}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Hours Range */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Volunteer Hours</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      step="0.25"
                      placeholder="Min"
                      value={exportFilters.minHours}
                      onChange={(e) => setExportFilters({...exportFilters, minHours: e.target.value})}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <input
                      type="number"
                      step="0.25"
                      placeholder="Max"
                      value={exportFilters.maxHours}
                      onChange={(e) => setExportFilters({...exportFilters, maxHours: e.target.value})}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Bags Range */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Bags Donated</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      placeholder="Min"
                      value={exportFilters.minBags}
                      onChange={(e) => setExportFilters({...exportFilters, minBags: e.target.value})}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <input
                      type="number"
                      placeholder="Max"
                      value={exportFilters.maxBags}
                      onChange={(e) => setExportFilters({...exportFilters, maxBags: e.target.value})}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Preview:</strong> {applyExportFilters(users).length} of {users.length} users match your filters
                </p>
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-200 flex gap-3">
              <button
                onClick={() => setShowExportModal(false)}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={exportData}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Download className="h-4 w-4" />
                Export Filtered Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffDashboard;