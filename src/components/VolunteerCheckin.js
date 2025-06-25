import React, { useState, useEffect } from 'react';
import { Search, User, Plus, Clock, ArrowLeft, Users, CheckCircle, XCircle } from 'lucide-react';
import { db } from '../utils/database';

const VolunteerCheckin = () => {
  const [currentView, setCurrentView] = useState('search');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [lastAction, setLastAction] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeVolunteers, setActiveVolunteers] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    city: '',
    organization: '',
    dateOfBirth: ''  // Changed from age
  });
  

  // Force re-render when database changes
  const [, forceUpdate] = useState({});
  const refreshData = () => forceUpdate({});

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Load active volunteers on component mount
  useEffect(() => {
    loadActiveVolunteers();
  }, []);

  const loadActiveVolunteers = async () => {
    const volunteers = await db.getActiveVolunteers();
    setActiveVolunteers(volunteers);
  };

  // Smart search function with async
  useEffect(() => {
    const searchUsers = async () => {
      if (searchTerm.length > 1) {
        setLoading(true);
        const filtered = await db.findUsers(searchTerm);
        setSearchResults(filtered);
        setLoading(false);
      } else {
        setSearchResults([]);
      }
    };
    
    // Debounce search to avoid too many API calls
    const timeoutId = setTimeout(searchUsers, 300);
    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const formatTime = (date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (date) => {
    return date.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
  };

  const calculateHours = (checkInTime) => {
    const hours = (new Date() - checkInTime) / (1000 * 60 * 60);
    return Math.round(hours * 4) / 4; // Round to nearest 15 minutes
  };

  const handleUserSelect = (user) => {
    setSelectedUser(user);
    setCurrentView('action');
  };

  const handleCheckIn = async () => {
    setLastAction('checked in');
    setLoading(true);
    
    const updatedUser = await db.checkInVolunteer(selectedUser.id);
    if (updatedUser) {
      setSelectedUser(updatedUser);
      setCurrentView('success');
      refreshData();
      await loadActiveVolunteers(); // Refresh active volunteers list
    }
    setLoading(false);
    
    setTimeout(() => {
      resetToSearch();
    }, 3000);
  };

  const handleCheckOut = async () => {
    setLastAction('checked out');
    setLoading(true);
    
    const updatedUser = await db.checkOutVolunteer(selectedUser.id);
    if (updatedUser) {
      setSelectedUser(updatedUser);
      setCurrentView('success');
      refreshData();
      await loadActiveVolunteers(); // Refresh active volunteers list
    }
    setLoading(false);
    
    setTimeout(() => {
      resetToSearch();
    }, 3000);
  };

  const handleRegister = async () => {
    setLastAction('checked in');
    setLoading(true);
    
    const newUser = await db.createUser({
      ...formData,
      age: parseInt(formData.age)
    });
    
    if (newUser) {
      const updatedUser = await db.checkInVolunteer(newUser.id);
      if (updatedUser) {
        setSelectedUser(updatedUser);
        setCurrentView('success');
        refreshData();
        await loadActiveVolunteers();
      }
    }
    setLoading(false);
    
    // Reset form
    setFormData({
      name: '',
      email: '',
      phone: '',
      city: '',
      organization: '',
      age: ''
    });
    
    setTimeout(() => {
      resetToSearch();
    }, 3000);
  };

  const resetToSearch = () => {
    setCurrentView('search');
    setSearchTerm('');
    setSelectedUser(null);
    setLastAction('');
  };

  // Search View
  if (currentView === 'search') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 p-8">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <Users className="mx-auto h-16 w-16 text-emerald-600 mb-4" />
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Volunteer Check-In</h1>
            <p className="text-xl text-gray-600">Search for your profile or register as new volunteer</p>
            <div className="mt-4 p-4 bg-white rounded-xl shadow-sm">
              <p className="text-lg font-medium text-gray-700">
                {formatTime(currentTime)} • {formatDate(currentTime)}
              </p>
              <p className="text-sm text-emerald-600 mt-1">
                {activeVolunteers.length} volunteer{activeVolunteers.length !== 1 ? 's' : ''} currently active
              </p>
            </div>
          </div>

          {activeVolunteers.length > 0 && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-6">
              <h3 className="font-semibold text-emerald-800 mb-2">Currently Checked In:</h3>
              <div className="space-y-2">
                {activeVolunteers.map(volunteer => (
                  <div key={volunteer.id} className="flex justify-between items-center text-sm">
                    <span className="text-emerald-700">{volunteer.name}</span>
                    <span className="text-emerald-600">
                      {calculateHours(volunteer.last_check_in)}h today
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
            <div className="relative mb-6">
              <Search className="absolute left-4 top-4 h-6 w-6 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, email, phone, or organization..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-4 text-xl border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:outline-none"
                autoFocus
              />
              {loading && (
                <div className="absolute right-4 top-4">
                  <div className="animate-spin h-6 w-6 border-2 border-emerald-600 border-t-transparent rounded-full"></div>
                </div>
              )}
            </div>

            {searchResults.length > 0 && (
              <div className="space-y-3 mb-6">
                {searchResults.map(user => (
                  <button
                    key={user.id}
                    onClick={() => handleUserSelect(user)}
                    className={`w-full p-4 rounded-xl text-left transition-colors ${
                      user.is_checked_in 
                        ? 'bg-emerald-50 hover:bg-emerald-100 border-2 border-emerald-200' 
                        : 'bg-gray-50 hover:bg-emerald-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-lg">{user.name}</h3>
                          {user.is_checked_in && (
                            <CheckCircle className="h-5 w-5 text-emerald-600" />
                          )}
                        </div>
                        <p className="text-gray-600">{user.email} • {user.organization}</p>
                        <p className="text-sm text-gray-500">
                          Volunteer hours: {user.total_hours} • Bags donated: {user.total_bags}
                          {user.is_checked_in && user.last_check_in && (
                            <span className="text-emerald-600 ml-2">
                              • Currently: {calculateHours(new Date(user.last_check_in))}h today
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {user.is_checked_in ? (
                          <div className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-sm font-medium">
                            ACTIVE
                          </div>
                        ) : (
                          <User className="h-8 w-8 text-emerald-600" />
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {searchTerm.length > 1 && searchResults.length === 0 && !loading && (
              <div className="text-center py-4 text-gray-500">
                No users found. Ready to register as a new volunteer?
              </div>
            )}

            <button
              onClick={() => setCurrentView('register')}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xl font-semibold py-4 px-6 rounded-xl transition-colors flex items-center justify-center gap-3"
            >
              <Plus className="h-6 w-6" />
              Register as New Volunteer
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Registration View
  if (currentView === 'register') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 p-8">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={resetToSearch}
            className="mb-6 flex items-center gap-2 text-emerald-600 hover:text-emerald-800 text-lg"
          >
            <ArrowLeft className="h-5 w-5" />
            Back to Search
          </button>

          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center">New Volunteer Registration</h2>
            
            <div className="space-y-4 mb-6">
              <input
                type="text"
                placeholder="Full Name *"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full p-4 text-lg border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:outline-none"
                required
              />
              <input
                type="email"
                placeholder="Email *"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="w-full p-4 text-lg border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:outline-none"
                required
              />
              <input
                type="tel"
                placeholder="Phone Number *"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                className="w-full p-4 text-lg border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:outline-none"
                required
              />
              <input
                type="text"
                placeholder="City"
                value={formData.city}
                onChange={(e) => setFormData({...formData, city: e.target.value})}
                className="w-full p-4 text-lg border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:outline-none"
              />
              <input
                type="text"
                placeholder="Organization (optional)"
                value={formData.organization}
                onChange={(e) => setFormData({...formData, organization: e.target.value})}
                className="w-full p-4 text-lg border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:outline-none"
              />
              <input
                type="date"
                placeholder="Date of Birth"
                value={formData.dateOfBirth}
                onChange={(e) => setFormData({...formData, dateOfBirth: e.target.value})}
                className="w-full p-4 text-lg border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div className="mb-6 p-4 bg-emerald-50 rounded-xl text-center">
              <Clock className="mx-auto h-8 w-8 text-emerald-600 mb-2" />
              <p className="text-emerald-800 font-medium">
                You'll be automatically checked in at {formatTime(currentTime)}
              </p>
            </div>

            <button
              onClick={handleRegister}
              disabled={!formData.name || !formData.email || !formData.phone || loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white text-xl font-semibold py-4 px-6 rounded-xl transition-colors flex items-center justify-center gap-3"
            >
              {loading ? (
                <div className="animate-spin h-6 w-6 border-2 border-white border-t-transparent rounded-full"></div>
              ) : (
                <>
                  <Plus className="h-6 w-6" />
                  Complete Registration & Check In
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Action View (Check In/Out)
  if (currentView === 'action') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 p-8">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={resetToSearch}
            className="mb-6 flex items-center gap-2 text-emerald-600 hover:text-emerald-800 text-lg"
          >
            <ArrowLeft className="h-5 w-5" />
            Back to Search
          </button>

          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome!</h2>
              <h3 className="text-2xl text-emerald-600 mb-4">{selectedUser.name}</h3>
              <p className="text-gray-600 mb-2">
                Volunteer hours: {selectedUser.total_hours} • Bags donated: {selectedUser.total_bags}
              </p>
              <p className="text-lg font-medium text-gray-700">
                Current time: {formatTime(currentTime)}
              </p>
            </div>

            {selectedUser.is_checked_in ? (
              <div className="space-y-6">
                <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <CheckCircle className="mx-auto h-12 w-12 text-emerald-600 mb-3" />
                  <h4 className="text-xl font-semibold text-emerald-800 mb-2">Currently Checked In</h4>
                  <p className="text-emerald-700">
                    Since: {formatTime(new Date(selectedUser.last_check_in))}
                  </p>
                  <p className="text-lg font-bold text-emerald-800 mt-2">
                    Hours today: {calculateHours(new Date(selectedUser.last_check_in))}
                  </p>
                </div>
                
                <button
                  onClick={handleCheckOut}
                  disabled={loading}
                  className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-300 text-white text-2xl font-semibold py-6 px-8 rounded-xl transition-colors flex items-center justify-center gap-3"
                >
                  {loading ? (
                    <div className="animate-spin h-8 w-8 border-2 border-white border-t-transparent rounded-full"></div>
                  ) : (
                    <>
                      <XCircle className="h-8 w-8" />
                      Check Out
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="p-6 bg-gray-50 border border-gray-200 rounded-xl">
                  <Clock className="mx-auto h-12 w-12 text-gray-600 mb-3" />
                  <h4 className="text-xl font-semibold text-gray-800 mb-2">Ready to Check In</h4>
                  <p className="text-gray-600">
                    Start your volunteer session
                  </p>
                </div>
                
                <button
                  onClick={handleCheckIn}
                  disabled={loading}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white text-2xl font-semibold py-6 px-8 rounded-xl transition-colors flex items-center justify-center gap-3"
                >
                  {loading ? (
                    <div className="animate-spin h-8 w-8 border-2 border-white border-t-transparent rounded-full"></div>
                  ) : (
                    <>
                      <CheckCircle className="h-8 w-8" />
                      Check In
                    </>
                  )}
                </button>
                </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Success View
  if (currentView === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-green-100 p-8 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-12 text-center max-w-lg">
          <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            {lastAction === 'checked in' ? (
              <CheckCircle className="h-12 w-12 text-emerald-600" />
            ) : (
              <XCircle className="h-12 w-12 text-emerald-600" />
            )}
          </div>
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            {lastAction === 'checked in' ? 'Welcome!' : 'Thank You!'}
          </h2>
          <p className="text-xl text-gray-600 mb-2">
            {selectedUser.name}
          </p>
          <p className="text-lg text-emerald-600 mb-4">
            Successfully {lastAction} at {formatTime(currentTime)}
          </p>
          <p className="text-sm text-gray-500 mb-4">
            Total contributions: {selectedUser.total_hours} volunteer hours • {selectedUser.total_bags} bags donated
          </p>
          <p className="text-gray-500">
            Returning to check-in screen...
          </p>
        </div>
      </div>
    );
  }
};

export default VolunteerCheckin;