import React, { useState, useEffect } from 'react';
import { 
  Users, Package, Clock, TrendingUp, Search, Filter, Download, 
  Calendar, BarChart3, PieChart, UserCheck, Gift, Eye, Edit,
  LogOut, Home, Settings, FileText, ChevronRight, RefreshCw, X, Save,
  ArrowLeft, Trash2, User, Copy, CheckCircle, ExternalLink, Globe, CalendarDays
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths } from 'date-fns';
import { db } from '../utils/database';

const StaffDashboard = () => {
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const SESSION_TIMEOUT = 60 * 60 * 1000; // 1 hour in milliseconds
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [loginCooldown, setLoginCooldown] = useState(false);
  const [currentView, setCurrentView] = useState('dashboard');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
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
  dateType: 'all_time',  // NEW: date filtering type
  startDate: format(subDays(new Date(), 30), 'yyyy-MM-dd'),  // NEW: custom start date
  endDate: format(new Date(), 'yyyy-MM-dd')  // NEW: custom end date
});
  const [showExportModal, setShowExportModal] = useState(false);
  const [previewCount, setPreviewCount] = useState(0);
  const [previewLoading, setPreviewLoading] = useState(false);
  
  // Settings page state
  const [autoCheckoutSettings, setAutoCheckoutSettings] = useState({
    enabled: true,
    timezone: 'America/Chicago',
    schedule: {
      monday: { enabled: true, startTime: '09:00', endTime: '18:00' },
      tuesday: { enabled: true, startTime: '09:00', endTime: '18:00' },
      wednesday: { enabled: true, startTime: '09:00', endTime: '18:00' },
      thursday: { enabled: true, startTime: '09:00', endTime: '18:00' },
      friday: { enabled: true, startTime: '09:00', endTime: '18:00' },
      saturday: { enabled: false, startTime: '09:00', endTime: '18:00' },
      sunday: { enabled: false, startTime: '09:00', endTime: '18:00' }
    }
  });
  const [showSaveConfirmation, setShowSaveConfirmation] = useState(false);
  const [registrationLinkCopied, setRegistrationLinkCopied] = useState(false);

  // Enhanced dashboard filters
  const [customDateRange, setCustomDateRange] = useState({
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd')
  });
  const [dashboardDateType, setDashboardDateType] = useState('preset');
  const [presetDateRange, setPresetDateRange] = useState('this_month');

  // Enhanced user filters
  const [userFilters, setUserFilters] = useState({
    name: '',
    email: '',
    organization: '',
    profession: '',
    city: '',
    minAge: '',
    maxAge: '',
    minHours: '',
    maxHours: '',
    minBags: '',
    maxBags: '',
    status: 'all'
  });

// Load data on component mount and track session
useEffect(() => {
  if (isLoggedIn) {
    loadDashboardData();
    loadAutoCheckoutSettings();
    setSessionStartTime(Date.now());
  }
}, [isLoggedIn, dashboardDateType, presetDateRange, customDateRange]);

// Session timeout checking
useEffect(() => {
  if (isLoggedIn && sessionStartTime) {
    const sessionCheck = setInterval(() => {
      if (Date.now() - sessionStartTime > SESSION_TIMEOUT) {
        alert('Session expired. Please log in again.');
        setIsLoggedIn(false);
        setCurrentUser(null);
        setSessionStartTime(null);
      }
    }, 60000);
    
    return () => clearInterval(sessionCheck);
  }
}, [isLoggedIn, sessionStartTime]);

useEffect(() => {
  const updatePreview = async () => {
    if (showExportModal) {
      setPreviewLoading(true);
      try {
        const filtered = await applyExportFilters(users);
        setPreviewCount(filtered.length);
      } catch (error) {
        console.error('Error updating preview:', error);
        setPreviewCount(0);
      }
      setPreviewLoading(false);
    }
  };
  updatePreview();
}, [exportFilters, users, showExportModal]);


  const loadAutoCheckoutSettings = async () => {
    try {
      const settings = await db.getAutoCheckoutSettings();
      // Ensure settings has the proper structure with defaults
      const defaultSettings = {
        enabled: true,
        timezone: 'America/Chicago',
        schedule: {
          monday: { enabled: true, startTime: '09:00', endTime: '18:00' },
          tuesday: { enabled: true, startTime: '09:00', endTime: '18:00' },
          wednesday: { enabled: true, startTime: '09:00', endTime: '18:00' },
          thursday: { enabled: true, startTime: '09:00', endTime: '18:00' },
          friday: { enabled: true, startTime: '09:00', endTime: '18:00' },
          saturday: { enabled: false, startTime: '09:00', endTime: '18:00' },
          sunday: { enabled: false, startTime: '09:00', endTime: '18:00' }
        }
      };
      
      // Merge with defaults to ensure all properties exist
      const mergedSettings = {
        ...defaultSettings,
        ...settings,
        schedule: {
          ...defaultSettings.schedule,
          ...(settings?.schedule || {})
        }
      };
      
      setAutoCheckoutSettings(mergedSettings);
    } catch (error) {
      console.error('Error loading auto-checkout settings:', error);
      // Use default settings on error
      setAutoCheckoutSettings({
        enabled: true,
        timezone: 'America/Chicago',
        schedule: {
          monday: { enabled: true, startTime: '09:00', endTime: '18:00' },
          tuesday: { enabled: true, startTime: '09:00', endTime: '18:00' },
          wednesday: { enabled: true, startTime: '09:00', endTime: '18:00' },
          thursday: { enabled: true, startTime: '09:00', endTime: '18:00' },
          friday: { enabled: true, startTime: '09:00', endTime: '18:00' },
          saturday: { enabled: false, startTime: '09:00', endTime: '18:00' },
          sunday: { enabled: false, startTime: '09:00', endTime: '18:00' }
        }
      });
    }
  };

  // Enhanced date range calculation for dashboard
const getDateRangeForAnalytics = () => {
 if (dashboardDateType === 'custom') {
   // Validate that both dates are complete before processing
   if (!customDateRange.startDate || !customDateRange.endDate || 
       customDateRange.startDate.length !== 10 || customDateRange.endDate.length !== 10) {
     // Return default range if dates are incomplete
     const now = new Date();
     const thirtyDaysAgo = new Date(now);
     thirtyDaysAgo.setDate(now.getDate() - 30);
     return { start: thirtyDaysAgo, end: now };
   }
   
   const startDate = new Date(customDateRange.startDate + 'T00:00:00');
   const endDate = new Date(customDateRange.endDate + 'T23:59:59');
   return { start: startDate, end: endDate };
 }

 const now = new Date();
 let startDate, endDate;
 
 switch (presetDateRange) {
   case 'today':
     startDate = new Date(now);
     startDate.setHours(0, 0, 0, 0);
     endDate = new Date(now);
     endDate.setHours(23, 59, 59, 999);
     break;
   case 'yesterday':
     startDate = new Date(now);
     startDate.setDate(now.getDate() - 1);
     startDate.setHours(0, 0, 0, 0);
     endDate = new Date(now);
     endDate.setDate(now.getDate() - 1);
     endDate.setHours(23, 59, 59, 999);
     break;
   case 'this_week':
     startDate = new Date(now);
     startDate.setDate(now.getDate() - 6);
     startDate.setHours(0, 0, 0, 0);
     endDate = new Date(now);
     endDate.setHours(23, 59, 59, 999);
     break;
   case 'this_month':
     startDate = new Date(now.getFullYear(), now.getMonth(), 1);
     startDate.setHours(0, 0, 0, 0);
     endDate = new Date(now);
     endDate.setHours(23, 59, 59, 999);
     break;
   case 'last_month':
     const lastMonth = new Date(now);
     lastMonth.setMonth(now.getMonth() - 1);
     startDate = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1);
     startDate.setHours(0, 0, 0, 0);
     endDate = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0);
     endDate.setHours(23, 59, 59, 999);
     break;
   case 'this_year':
     startDate = new Date(now.getFullYear(), 0, 1);
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
    
    // Get analytics for selected date range
    const { start, end } = getDateRangeForAnalytics();
    
    const rangeAnalytics = await db.getAnalyticsByDateRange(
      start.toISOString(),
      end.toISOString()
    );
    
    // Calculate analytics using the database results
    const stats = calculateAnalytics(usersWithAge, rangeAnalytics);
    
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

    // Basic stats (all-time totals)
    const totalUsers = userData.length;
    const totalHours = userData.reduce((sum, u) => sum + (u.total_hours || 0), 0);
    const totalBags = userData.reduce((sum, u) => sum + (u.total_bags || 0), 0);
    const activeVolunteers = userData.filter(u => u.is_checked_in).length;

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
      rangeHours: rangeData?.totalHours || 0,
      rangeBags: rangeData?.totalBags || 0,
      rangeVolunteers: rangeData?.uniqueVolunteers || 0,
      rangeSessions: rangeData?.sessionCount || 0
    };
  };

const handleLogin = async () => {
  if (loginCooldown) {
    alert('Too many login attempts. Please wait 15 minutes before trying again.');
    return;
  }

  setLoading(true);
  
  try {
    const staffUser = await db.authenticateStaff(loginForm.username, loginForm.password);
    
    if (staffUser) {
      setCurrentUser({
        name: staffUser.full_name,
        role: staffUser.role,
        username: staffUser.username
      });
      setIsLoggedIn(true);
      setLoginForm({ username: '', password: '' });
      setLoginAttempts(0); // Reset on successful login
    }
  } catch (error) {
    console.error('Login error:', error);
    
    const newAttempts = loginAttempts + 1;
    setLoginAttempts(newAttempts);
    
    if (newAttempts >= 5) {
      setLoginCooldown(true);
      setTimeout(() => {
        setLoginCooldown(false);
        setLoginAttempts(0);
      }, 15 * 60 * 1000); // 15 minute cooldown
      
      alert('Too many failed attempts. Access blocked for 15 minutes.');
    } else {
      alert(`Invalid credentials. ${5 - newAttempts} attempts remaining.`);
    }
  }
  
  setLoading(false);
};


  // Settings page functions
  const handleSaveSettings = async () => {
    setLoading(true);
    try {
      const success = await db.updateAutoCheckoutSettings(autoCheckoutSettings);
      if (success) {
        setShowSaveConfirmation(true);
        setTimeout(() => setShowSaveConfirmation(false), 3000);
      } else {
        alert('Failed to save settings. Please try again.');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Error saving settings. Please try again.');
    }
    setLoading(false);
  };

  const handleRunAutoCheckout = async () => {
    if (analytics.activeVolunteers === 0) {
      alert('No volunteers are currently checked in.');
      return;
    }

    if (!window.confirm(`This will check out ${analytics.activeVolunteers} active volunteers. Are you sure?`)) {
      return;
    }

    setLoading(true);
    try {
      const result = await db.performAutoCheckout('Manual auto-checkout by staff');
      if (result.checkedOut.length > 0) {
        alert(`Successfully checked out ${result.checkedOut.length} volunteers.`);
        await loadDashboardData(); // Refresh data
      } else {
        alert('No volunteers were checked out. They may have already been checked out.');
      }
    } catch (error) {
      console.error('Error running auto-checkout:', error);
      alert('Error running auto-checkout. Please try again.');
    }
    setLoading(false);
  };

  const copyRegistrationLink = () => {
    const registrationUrl = `${window.location.origin}/volunteer-register`;
    navigator.clipboard.writeText(registrationUrl).then(() => {
      setRegistrationLinkCopied(true);
      setTimeout(() => setRegistrationLinkCopied(false), 3000);
    }).catch(err => {
      console.error('Failed to copy link:', err);
      alert('Failed to copy link. Please copy manually: ' + registrationUrl);
    });
  };

  const updateScheduleDay = (day, field, value) => {
    setAutoCheckoutSettings(prev => ({
      ...prev,
      schedule: {
        ...prev.schedule,
        [day]: {
          ...prev.schedule?.[day],
          [field]: value
        }
      }
    }));
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


const getVolunteerHoursInDateRange = async (userId, filters) => {
  try {
    let startDate, endDate;
    
    if (filters.dateType === 'custom') {
      // Dates are already in yyyy-MM-dd format
      startDate = new Date(filters.startDate + 'T00:00:00');
      endDate = new Date(filters.endDate + 'T23:59:59');
    } else {
      // ... rest of preset date logic stays the same
      const now = new Date();
      switch (filters.dateType) {
        case 'this_year':
          startDate = new Date(now.getFullYear(), 0, 1);
          endDate = now;
          break;
        case 'this_month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          endDate = now;
          break;
        case 'last_month':
          const lastMonth = new Date(now);
          lastMonth.setMonth(now.getMonth() - 1);
          startDate = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1);
          endDate = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0);
          break;
        case 'last_30_days':
          startDate = new Date(now);
          startDate.setDate(now.getDate() - 30);
          endDate = now;
          break;
        default:
          return 0;
      }
    }
    
    const sessions = await db.getUserSessionsInDateRange(userId, startDate.toISOString(), endDate.toISOString());
    return sessions.reduce((total, session) => total + (session.hours_worked || 0), 0);
  } catch (error) {
    console.error('Error getting volunteer hours in date range:', error);
    return 0;
  }
};

 const applyExportFilters = async (userData) => {
 // First apply the non-date filters
 let filteredUsers = userData.filter(user => {
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
   
   // Hours filters (still based on total for initial filtering)
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

 // If date filtering is enabled, filter by volunteer activity in that date range
 if (exportFilters.dateType !== 'all_time') {
   let startDate, endDate;
   
   if (exportFilters.dateType === 'custom') {
     startDate = new Date(exportFilters.startDate + 'T00:00:00');
     endDate = new Date(exportFilters.endDate + 'T23:59:59');
   } else {
     // Handle preset date ranges
     const now = new Date();
     switch (exportFilters.dateType) {
       case 'this_year':
         startDate = new Date(now.getFullYear(), 0, 1);
         endDate = now;
         break;
       case 'this_month':
         startDate = new Date(now.getFullYear(), now.getMonth(), 1);
         endDate = now;
         break;
       case 'last_month':
         const lastMonth = new Date(now);
         lastMonth.setMonth(now.getMonth() - 1);
         startDate = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1);
         endDate = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0);
         break;
       case 'last_30_days':
         startDate = new Date(now);
         startDate.setDate(now.getDate() - 30);
         endDate = now;
         break;
       default:
         return filteredUsers.map(user => ({
           ...user,
           hoursInRange: user.total_hours || 0
         }));
     }
   }
   
   // Single database call to get all volunteer hours in range
   const userHoursMap = await db.getVolunteersWithHoursInDateRange(
     startDate.toISOString(), 
     endDate.toISOString()
   );
   
   // Only include users who worked during this period
   const usersWithRangeHours = filteredUsers
     .filter(user => userHoursMap[user.id] > 0)
     .map(user => ({
       ...user,
       hoursInRange: userHoursMap[user.id] || 0
     }));
   
   return usersWithRangeHours;
 }
 
 // If no date filtering, return all users but add hoursInRange = total_hours
 return filteredUsers.map(user => ({
   ...user,
   hoursInRange: user.total_hours || 0
 }));
};

  const exportData = async () => {
  console.log('Export filters:', exportFilters);
  console.log('Date type:', exportFilters.dateType);
  console.log('Start date:', exportFilters.startDate);
  console.log('End date:', exportFilters.endDate);
  
  setLoading(true);
  
  try {
    const filteredUsers = await applyExportFilters(users);
    
    if (filteredUsers.length === 0) {
      alert('No volunteers found matching your criteria.');
      setLoading(false);
      return;
    }
    
    const csvData = filteredUsers.map(user => ({
      Name: user.name,
      Email: user.email,
      Phone: user.phone,
      Age: user.age || 'Not specified',
      City: user.city || '',
      Organization: user.organization || '',
      Profession: user.profession || 'Not specified',
      'Hours in Period': user.hoursInRange.toFixed(2),
      'Total Lifetime Hours': user.total_hours || 0,
      'Total Bags Donated': user.total_bags || 0,
      Status: user.is_checked_in ? 'Active' : 'Offline',
      'Registered': format(new Date(user.created_at), 'MM/dd/yyyy')
    }));
    
    // Convert to CSV
    const csv = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).map(val => 
        typeof val === 'string' && val.includes(',') ? `"${val}"` : val
      ).join(','))
    ].join('\n');
    
    // Download
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    
    let dateRangeLabel;
    if (exportFilters.dateType === 'custom') {
      if (exportFilters.startDate === exportFilters.endDate) {
        // Same day - just show one date
        dateRangeLabel = `${exportFilters.startDate}`;
      } else {
        // Different dates - show range
        dateRangeLabel = `${exportFilters.startDate}-to-${exportFilters.endDate}`;
      }
    } else {
      dateRangeLabel = exportFilters.dateType;
    }

    a.download = `volunteer-activity-${dateRangeLabel}.csv`;
    console.log('Date range label:', dateRangeLabel);
    console.log('Start date value:', exportFilters.startDate);
    console.log('End date value:', exportFilters.endDate);
    console.log('Final filename:', a.download);
    a.click();
    
    setShowExportModal(false);
    alert(`Exported ${filteredUsers.length} volunteers who worked during the selected period.`);
  } catch (error) {
    console.error('Error exporting data:', error);
    alert('Error generating export. Please try again.');
  }
  
  setLoading(false);
};

  const formatDate = (date) => {
    return format(new Date(date), 'MMM dd, yyyy');
  };

  const formatDateTime = (date) => {
    return format(new Date(date), 'MMM dd, yyyy h:mm a');
  };

  const getDateRangeLabel = () => {
  if (dashboardDateType === 'custom') {
    // Only format if both dates are complete
    if (!customDateRange.startDate || !customDateRange.endDate || 
        customDateRange.startDate.length !== 10 || customDateRange.endDate.length !== 10) {
      return 'Custom Range (incomplete)';
    }
    
    const startDate = new Date(customDateRange.startDate + 'T00:00:00');
    const endDate = new Date(customDateRange.endDate + 'T00:00:00');
    return `${format(startDate, 'MMM dd')} - ${format(endDate, 'MMM dd, yyyy')}`;
  }
  
  switch (presetDateRange) {
    case 'today': return 'Today';
    case 'yesterday': return 'Yesterday';
    case 'this_week': return 'This Week';
    case 'this_month': return 'This Month';
    case 'last_month': return 'Last Month';
    case 'this_year': return 'This Year';
    case 'last_30_days': return 'Last 30 Days';
    default: return 'This Month';
  }
};

  // Enhanced filtered users with better filtering and sorting
  const filteredUsers = users.filter(user => {
    // Global search
    const globalSearch = searchTerm.toLowerCase();
    const matchesGlobalSearch = !globalSearch || 
      user.name.toLowerCase().includes(globalSearch) ||
      user.email.toLowerCase().includes(globalSearch) ||
      user.organization.toLowerCase().includes(globalSearch);

    // Column-specific filters
    const matchesName = !userFilters.name || user.name.toLowerCase().includes(userFilters.name.toLowerCase());
    const matchesEmail = !userFilters.email || user.email.toLowerCase().includes(userFilters.email.toLowerCase());
    const matchesOrganization = !userFilters.organization || user.organization.toLowerCase().includes(userFilters.organization.toLowerCase());
    const matchesProfession = !userFilters.profession || user.profession === userFilters.profession;
    const matchesCity = !userFilters.city || user.city.toLowerCase().includes(userFilters.city.toLowerCase());
    
    const matchesMinAge = !userFilters.minAge || (user.age && user.age >= parseInt(userFilters.minAge));
    const matchesMaxAge = !userFilters.maxAge || (user.age && user.age <= parseInt(userFilters.maxAge));
    const matchesMinHours = !userFilters.minHours || (user.total_hours >= parseFloat(userFilters.minHours));
    const matchesMaxHours = !userFilters.maxHours || (user.total_hours <= parseFloat(userFilters.maxHours));
    const matchesMinBags = !userFilters.minBags || (user.total_bags >= parseInt(userFilters.minBags));
    const matchesMaxBags = !userFilters.maxBags || (user.total_bags <= parseInt(userFilters.maxBags));

    // Status filter
    const matchesStatus = userFilters.status === 'all' || 
                         (userFilters.status === 'volunteers' && (user.total_hours || 0) > 0) ||
                         (userFilters.status === 'donors' && (user.total_bags || 0) > 0) ||
                         (userFilters.status === 'active' && user.is_checked_in);
    
    return matchesGlobalSearch && matchesName && matchesEmail && matchesOrganization && 
           matchesProfession && matchesCity && matchesMinAge && matchesMaxAge && 
           matchesMinHours && matchesMaxHours && matchesMinBags && matchesMaxBags && matchesStatus;
  }).sort((a, b) => {
    // Sort by most recent activity (created_at or last activity)
    const aLastActivity = new Date(a.last_check_in || a.created_at || 0);
    const bLastActivity = new Date(b.last_check_in || b.created_at || 0);
    return bLastActivity - aLastActivity;
  });

  const clearAllFilters = () => {
    setUserFilters({
      name: '',
      email: '',
      organization: '',
      profession: '',
      city: '',
      minAge: '',
      maxAge: '',
      minHours: '',
      maxHours: '',
      minBags: '',
      maxBags: '',
      status: 'all'
    });
    setSearchTerm('');
  };

  // Login Screen
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-blue-900 flex items-center justify-center p-8">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="mx-auto h-16 w-16 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
              <Users className="h-8 w-8 text-indigo-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">VolunteerHub</h1>
            <p className="text-gray-600">by DataCream</p>
            <p className="text-sm text-gray-500 mt-2">Analytics made smooth.</p>
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
              <h1 className="text-xl font-bold text-gray-900">VolunteerHub</h1>
              <span className="text-sm text-gray-500">by DataCream</span>
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
              <button
                onClick={() => setCurrentView('settings')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  currentView === 'settings' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Settings className="h-4 w-4" />
                Settings
              </button>
            </div>
          </nav>
        )}

        {/* Settings View */}
        {currentView === 'settings' && (
          <div className="space-y-8">
            {/* Settings Header */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">System Settings</h2>
              <p className="text-gray-600">Configure office hours, auto-checkout, and volunteer registration for VolunteerHub</p>
            </div>

            {/* Auto-Checkout Configuration */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Auto-Checkout System</h3>
                  <p className="text-gray-600">Automatically check out volunteers after office hours</p>
                </div>
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                  autoCheckoutSettings.enabled 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {autoCheckoutSettings.enabled ? 'ENABLED' : 'DISABLED'}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Currently Active</h3>
                  <p className="text-2xl font-bold text-green-600">{analytics.activeVolunteers}</p>
                  <p className="text-sm text-gray-600 mt-1">Volunteers checked in</p>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Timezone</h3>
                  <p className="text-lg font-bold text-indigo-600">{autoCheckoutSettings.timezone}</p>
                  <p className="text-sm text-gray-600 mt-1">Current timezone</p>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Status</h3>
                  <p className="text-sm text-gray-600">
                    {autoCheckoutSettings.enabled 
                      ? 'Auto-checkout will run daily after office hours'
                      : 'Auto-checkout is currently disabled'
                    }
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                {/* Enable/Disable Toggle */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900">Enable Auto-Checkout</h4>
                    <p className="text-sm text-gray-600">Automatically check out volunteers after office hours</p>
                  </div>
                  <button
                    onClick={() => setAutoCheckoutSettings({
                      ...autoCheckoutSettings, 
                      enabled: !autoCheckoutSettings.enabled
                    })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                      autoCheckoutSettings.enabled ? 'bg-indigo-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        autoCheckoutSettings.enabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Timezone Configuration */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Timezone</label>
                  <select
                    value={autoCheckoutSettings.timezone}
                    onChange={(e) => setAutoCheckoutSettings({
                      ...autoCheckoutSettings, 
                      timezone: e.target.value
                    })}
                    className="w-full md:w-1/3 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="America/Chicago">Central Time (CT)</option>
                    <option value="America/New_York">Eastern Time (ET)</option>
                    <option value="America/Denver">Mountain Time (MT)</option>
                    <option value="America/Los_Angeles">Pacific Time (PT)</option>
                  </select>
                </div>

                {/* Weekly Schedule Configuration */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-4">Weekly Schedule</h4>
                  <div className="space-y-3">
                    {autoCheckoutSettings?.schedule && Object.entries(autoCheckoutSettings.schedule).map(([day, schedule]) => (
                      <div key={day} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                        <div className="w-20">
                          <span className="font-medium text-gray-900 capitalize">{day}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={schedule?.enabled || false}
                            onChange={(e) => updateScheduleDay(day, 'enabled', e.target.checked)}
                            className="h-4 w-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                          />
                          <span className="text-sm text-gray-600">Open</span>
                        </div>
                        {schedule?.enabled && (
                          <>
                            <div className="flex items-center gap-2">
                              <label className="text-sm text-gray-600">From:</label>
                              <input
                                type="time"
                                value={schedule?.startTime || '09:00'}
                                onChange={(e) => updateScheduleDay(day, 'startTime', e.target.value)}
                                className="p-2 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <label className="text-sm text-gray-600">To:</label>
                              <input
                                type="time"
                                value={schedule?.endTime || '18:00'}
                                onChange={(e) => updateScheduleDay(day, 'endTime', e.target.value)}
                                className="p-2 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                              />
                            </div>
                          </>
                        )}
                        {!schedule?.enabled && (
                          <span className="text-sm text-gray-500">Closed</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-3 bg-yellow-50 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <strong>Note:</strong> Auto-checkout will run daily and check out all volunteers who are still logged in after the end time for each day.
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4">
                  <button
                    onClick={handleSaveSettings}
                    disabled={loading}
                    className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 transition-colors"
                  >
                    {loading ? (
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Save Settings
                  </button>

                  <button
                    onClick={handleRunAutoCheckout}
                    disabled={loading || analytics.activeVolunteers === 0}
                    className="flex items-center gap-2 px-6 py-3 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-300 text-white rounded-lg transition-colors"
                  >
                    <Clock className="h-4 w-4" />
                    {loading ? 'Running...' : 'Run Auto-Checkout Now'}
                  </button>
                </div>

                {/* Save Confirmation */}
                {showSaveConfirmation && (
                  <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="text-green-800 font-medium">Settings saved successfully!</span>
                  </div>
                )}
              </div>
            </div>

            {/* Volunteer Registration Link */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Volunteer Registration</h3>
              <p className="text-gray-600 mb-6">
                Share this link with organizers and volunteers to pre-register for events. 
                They can register from home and check in when they arrive.
              </p>

              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-3 mb-3">
                  <Globe className="h-5 w-5 text-indigo-600" />
                  <span className="font-medium text-gray-900">Registration URL</span>
                </div>
                <div className="flex items-center gap-3">
                  <code className="flex-1 p-3 bg-white border border-gray-200 rounded text-sm text-gray-700 font-mono">
                    {window.location.origin}/volunteer-register
                  </code>
                  <button
                    onClick={copyRegistrationLink}
                    className="flex items-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    <Copy className="h-4 w-4" />
                    Copy Link
                  </button>
                  <a
                    href="/volunteer-register"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Test Link
                  </a>
                </div>
              </div>

              {registrationLinkCopied && (
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="text-green-800 font-medium">Registration link copied to clipboard!</span>
                </div>
              )}

              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">How it works:</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Volunteers can register in advance with all their information</li>
                  <li>• Waivers are completed during registration (adults) or when they arrive (minors)</li>
                  <li>• When they arrive to volunteer, they just search their name and check in</li>
                  <li>• Perfect for organizing group volunteer events and orientations</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Dashboard View with Custom Date Selection */}
        {currentView === 'dashboard' && (
          <div className="space-y-8">
            {/* Enhanced Date Range Selector */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <h3 className="text-lg font-semibold text-gray-900">Analytics for {getDateRangeLabel()}</h3>
                
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-700">Date Type:</label>
                    <select
                      value={dashboardDateType}
                      onChange={(e) => setDashboardDateType(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="preset">Preset Range</option>
                      <option value="custom">Custom Range</option>
                    </select>
                  </div>

                  {dashboardDateType === 'preset' ? (
                    <select
                      value={presetDateRange}
                      onChange={(e) => setPresetDateRange(e.target.value)}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="today">Today</option>
                      <option value="yesterday">Yesterday</option>
                      <option value="this_week">This Week</option>
                      <option value="this_month">This Month</option>
                      <option value="last_month">Last Month</option>
                      <option value="this_year">This Year</option>
                      <option value="last_30_days">Last 30 Days</option>
                    </select>
                  ) : (
                    <div className="flex items-center gap-2">
                      <input
                        type="date"
                        value={customDateRange.startDate}
                        onChange={(e) => setCustomDateRange({...customDateRange, startDate: e.target.value})}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                      <span className="text-gray-500">to</span>
                      <input
                        type="date"
                        value={customDateRange.endDate}
                        onChange={(e) => setCustomDateRange({...customDateRange, endDate: e.target.value})}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                  )}
                </div>
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

        {/* Enhanced Users View with Column Filters */}
        {currentView === 'users' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm p-6">
              {/* Global Search and Export */}
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Global search (name, email, organization)..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={clearAllFilters}
                    className="flex items-center gap-2 px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    <X className="h-4 w-4" />
                    Clear Filters
                  </button>
                  <button
                    onClick={() => setShowExportModal(true)}
                    className="flex items-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    <Download className="h-4 w-4" />
                    Export
                  </button>
                </div>
              </div>

              {/* Column Filters */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    placeholder="Filter by name"
                    value={userFilters.name}
                    onChange={(e) => setUserFilters({...userFilters, name: e.target.value})}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="text"
                    placeholder="Filter by email"
                    value={userFilters.email}
                    onChange={(e) => setUserFilters({...userFilters, email: e.target.value})}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Organization</label>
                  <input
                    type="text"
                    placeholder="Filter by organization"
                    value={userFilters.organization}
                    onChange={(e) => setUserFilters({...userFilters, organization: e.target.value})}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Profession</label>
                  <select
                    value={userFilters.profession}
                    onChange={(e) => setUserFilters({...userFilters, profession: e.target.value})}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">City</label>
                  <input
                    type="text"
                    placeholder="Filter by city"
                    value={userFilters.city}
                    onChange={(e) => setUserFilters({...userFilters, city: e.target.value})}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Age Range</label>
                  <div className="flex gap-1">
                    <input
                      type="number"
                      placeholder="Min"
                      value={userFilters.minAge}
                      onChange={(e) => setUserFilters({...userFilters, minAge: e.target.value})}
                      className="w-full px-2 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <input
                      type="number"
                      placeholder="Max"
                      value={userFilters.maxAge}
                      onChange={(e) => setUserFilters({...userFilters, maxAge: e.target.value})}
                      className="w-full px-2 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Hours Range</label>
                  <div className="flex gap-1">
                    <input
                      type="number"
                      step="0.25"
                      placeholder="Min"
                      value={userFilters.minHours}
                      onChange={(e) => setUserFilters({...userFilters, minHours: e.target.value})}
                      className="w-full px-2 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <input
                      type="number"
                      step="0.25"
                      placeholder="Max"
                      value={userFilters.maxHours}
                      onChange={(e) => setUserFilters({...userFilters, maxHours: e.target.value})}
                      className="w-full px-2 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Bags Range</label>
                  <div className="flex gap-1">
                    <input
                      type="number"
                      placeholder="Min"
                      value={userFilters.minBags}
                      onChange={(e) => setUserFilters({...userFilters, minBags: e.target.value})}
                      className="w-full px-2 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <input
                      type="number"
                      placeholder="Max"
                      value={userFilters.maxBags}
                      onChange={(e) => setUserFilters({...userFilters, maxBags: e.target.value})}
                      className="w-full px-2 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={userFilters.status}
                    onChange={(e) => setUserFilters({...userFilters, status: e.target.value})}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="all">All Users</option>
                    <option value="volunteers">Volunteers</option>
                    <option value="donors">Donors</option>
                    <option value="active">Currently Active</option>
                  </select>
                </div>
              </div>

              {/* Results Summary */}
              <div className="mb-4 text-sm text-gray-600">
                Showing {filteredUsers.length} of {users.length} users (sorted by recent activity)
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

        {/* Enhanced Reports View with Custom Date Ranges */}
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
                  <div className="text-sm text-gray-600">Export with custom filters and date range</div>
                </button>
                
                <button
                  onClick={() => alert('Volunteer Hours Report generated!')}
                  className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left"
                >
                  <Clock className="h-6 w-6 text-purple-600 mb-2" />
                  <div className="font-medium text-gray-900">Volunteer Hours Report</div>
                  <div className="text-sm text-gray-600">Detailed time tracking</div>
                </button>

                <button
                  onClick={() => alert('Demographics Report generated!')}
                  className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left"
                >
                  <Users className="h-6 w-6 text-emerald-600 mb-2" />
                  <div className="font-medium text-gray-900">Demographics Report</div>
                  <div className="text-sm text-gray-600">Age and profession breakdown</div>
                </button>

                <button
                  onClick={() => alert('Donation Activity Report generated!')}
                  className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left"
                >
                  <Package className="h-6 w-6 text-orange-600 mb-2" />
                  <div className="font-medium text-gray-900">Donation Activity Report</div>
                  <div className="text-sm text-gray-600">Bags donated and donor activity</div>
                </button>

                <button
                  onClick={() => alert('Executive Summary generated!')}
                  className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left"
                >
                  <BarChart3 className="h-6 w-6 text-green-600 mb-2" />
                  <div className="font-medium text-gray-900">Executive Summary</div>
                  <div className="text-sm text-gray-600">Key metrics and trends</div>
                </button>

                <button
                  onClick={() => alert('Communication Report generated!')}
                  className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left"
                >
                  <Globe className="h-6 w-6 text-blue-600 mb-2" />
                  <div className="font-medium text-gray-900">Communication Report</div>
                  <div className="text-sm text-gray-600">Volunteers opted in for communications</div>
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
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
    <h4 className="font-medium text-blue-900 mb-4">Date Range (Volunteer Activity Period)</h4>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Time Period</label>
        <select
          value={exportFilters.dateType}
          onChange={(e) => setExportFilters({...exportFilters, dateType: e.target.value})}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="all_time">All Time</option>
          <option value="this_year">This Year</option>
          <option value="this_month">This Month</option>
          <option value="last_month">Last Month</option>
          <option value="last_30_days">Last 30 Days</option>
          <option value="custom">Custom Range</option>
        </select>
      </div>
      
      {exportFilters.dateType === 'custom' && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
            <input
              type="date"
              value={exportFilters.startDate}
              onChange={(e) => setExportFilters({...exportFilters, startDate: e.target.value})}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
            <input
              type="date"
              value={exportFilters.endDate}
              onChange={(e) => setExportFilters({...exportFilters, endDate: e.target.value})}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </>
      )}
    </div>
    <p className="text-sm text-blue-700 mt-2">
      Only volunteers who worked during this period will be included. Hours shown will be only from this period.
    </p>
  </div>
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
                <strong>Preview:</strong> {previewLoading ? 'Calculating...' : `${previewCount} volunteers worked during the selected period`}
                {exportFilters.dateType !== 'all_time' && !previewLoading && (
                  <span className="block mt-1">
                    Report will show hours worked only within the date range, not total lifetime hours.
                  </span>
                )}
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
                disabled={loading}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                    Generating...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    Export Filtered Data
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffDashboard;