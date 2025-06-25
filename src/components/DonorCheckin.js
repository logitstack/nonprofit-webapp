import React, { useState, useEffect } from 'react';
import { Search, User, Plus, Check, ArrowLeft, Package } from 'lucide-react';
import { db } from '../utils/database';

const DonorCheckin = () => {
  const [currentView, setCurrentView] = useState('search');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [bagCount, setBagCount] = useState(1);
  const [loading, setLoading] = useState(false);
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

  const handleUserSelect = (user) => {
    setSelectedUser(user);
    setCurrentView('bagCount');
  };

  const handleCheckIn = async () => {
    setLoading(true);
    // Add donation to the shared database
    const updatedUser = await db.addDonation(selectedUser.id, bagCount);
    if (updatedUser) {
      setSelectedUser(updatedUser);
      setCurrentView('success');
      refreshData();
    }
    setLoading(false);
    
    // Auto-reset after 3 seconds
    setTimeout(() => {
      setCurrentView('search');
      setSearchTerm('');
      setSelectedUser(null);
      setBagCount(1);
    }, 3000);
  };

  const handleRegister = async () => {
    setLoading(true);
    // Create new user in shared database
    const newUser = await db.createUser({
      ...formData,
      age: parseInt(formData.age)
    });
    
    if (newUser) {
      // Add their first donation
      const updatedUser = await db.addDonation(newUser.id, bagCount);
      if (updatedUser) {
        setSelectedUser(updatedUser);
        setCurrentView('success');
        refreshData();
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
    
    // Auto-reset after 3 seconds
    setTimeout(() => {
      setCurrentView('search');
      setSearchTerm('');
      setSelectedUser(null);
      setBagCount(1);
    }, 3000);
  };

  const resetToSearch = () => {
    setCurrentView('search');
    setSearchTerm('');
    setSelectedUser(null);
    setBagCount(1);
  };

  // Search View
  if (currentView === 'search') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-12">
            <Package className="mx-auto h-16 w-16 text-indigo-600 mb-4" />
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Donor Check-In</h1>
            <p className="text-xl text-gray-600">Search for your profile or register as new donor</p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
            <div className="relative mb-6">
              <Search className="absolute left-4 top-4 h-6 w-6 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, email, phone, or organization..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-4 text-xl border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none"
                autoFocus
              />
              {loading && (
                <div className="absolute right-4 top-4">
                  <div className="animate-spin h-6 w-6 border-2 border-indigo-600 border-t-transparent rounded-full"></div>
                </div>
              )}
            </div>

            {searchResults.length > 0 && (
              <div className="space-y-3 mb-6">
                {searchResults.map(user => (
                  <button
                    key={user.id}
                    onClick={() => handleUserSelect(user)}
                    className="w-full p-4 bg-gray-50 hover:bg-indigo-50 rounded-xl text-left transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-lg">{user.name}</h3>
                        <p className="text-gray-600">{user.email} • {user.organization}</p>
                        <p className="text-sm text-gray-500">
                          Bags donated: {user.total_bags} • Volunteer hours: {user.total_hours}
                        </p>
                      </div>
                      <User className="h-8 w-8 text-indigo-600" />
                    </div>
                  </button>
                ))}
              </div>
            )}

            {searchTerm.length > 1 && searchResults.length === 0 && !loading && (
              <div className="text-center py-4 text-gray-500">
                No users found. Ready to register as a new donor?
              </div>
            )}

            <button
              onClick={() => setCurrentView('register')}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xl font-semibold py-4 px-6 rounded-xl transition-colors flex items-center justify-center gap-3"
            >
              <Plus className="h-6 w-6" />
              Register as New Donor
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Registration View
  if (currentView === 'register') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={resetToSearch}
            className="mb-6 flex items-center gap-2 text-indigo-600 hover:text-indigo-800 text-lg"
          >
            <ArrowLeft className="h-5 w-5" />
            Back to Search
          </button>

          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center">New Donor Registration</h2>
            
            <div className="space-y-4 mb-6">
              <input
                type="text"
                placeholder="Full Name *"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full p-4 text-lg border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none"
                required
              />
              <input
                type="email"
                placeholder="Email *"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="w-full p-4 text-lg border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none"
                required
              />
              <input
                type="tel"
                placeholder="Phone Number *"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                className="w-full p-4 text-lg border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none"
                required
              />
              <input
                type="text"
                placeholder="City"
                value={formData.city}
                onChange={(e) => setFormData({...formData, city: e.target.value})}
                className="w-full p-4 text-lg border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none"
              />
              <input
                type="text"
                placeholder="Organization (optional)"
                value={formData.organization}
                onChange={(e) => setFormData({...formData, organization: e.target.value})}
                className="w-full p-4 text-lg border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none"
              />
            <div className="relative">
                <input
                    type="date"
                    id="dateOfBirth"
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData({...formData, dateOfBirth: e.target.value})}
                    className="w-full p-4 text-lg border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none peer placeholder-transparent"
                    placeholder=" "
                />
                <label 
                    htmlFor="dateOfBirth"
                    className="absolute text-sm text-gray-500 duration-300 transform -translate-y-4 scale-75 top-2 z-10 origin-[0] bg-white px-2 peer-focus:px-2 peer-focus:text-indigo-600 peer-placeholder-shown:scale-100 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:top-1/2 peer-focus:top-2 peer-focus:scale-75 peer-focus:-translate-y-4 left-3"
                >
                    Date of Birth
                </label>
            </div>
            </div>

            <div className="mb-6 p-4 bg-gray-50 rounded-xl">
              <label className="block text-lg font-medium text-gray-700 mb-3">
                How many bags are you donating today?
              </label>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setBagCount(Math.max(1, bagCount - 1))}
                  className="bg-gray-200 hover:bg-gray-300 w-12 h-12 rounded-xl text-xl font-bold"
                >
                  -
                </button>
                <span className="text-3xl font-bold text-indigo-600 min-w-[3rem] text-center">
                  {bagCount}
                </span>
                <button
                  onClick={() => setBagCount(bagCount + 1)}
                  className="bg-gray-200 hover:bg-gray-300 w-12 h-12 rounded-xl text-xl font-bold"
                >
                  +
                </button>
              </div>
            </div>

            <button
              onClick={handleRegister}
              disabled={!formData.name || !formData.email || !formData.phone || loading}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white text-xl font-semibold py-4 px-6 rounded-xl transition-colors flex items-center justify-center gap-3"
            >
              {loading ? (
                <div className="animate-spin h-6 w-6 border-2 border-white border-t-transparent rounded-full"></div>
              ) : (
                <>
                  <Check className="h-6 w-6" />
                  Complete Registration & Check In
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Bag Count View
  if (currentView === 'bagCount') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={resetToSearch}
            className="mb-6 flex items-center gap-2 text-indigo-600 hover:text-indigo-800 text-lg"
          >
            <ArrowLeft className="h-5 w-5" />
            Back to Search
          </button>

          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome back!</h2>
              <h3 className="text-2xl text-indigo-600 mb-4">{selectedUser.name}</h3>
              <p className="text-gray-600">
                Bags donated: {selectedUser.total_bags} • Volunteer hours: {selectedUser.total_hours}
              </p>
            </div>

            <div className="mb-8">
              <label className="block text-2xl font-medium text-gray-700 mb-6">
                How many bags are you donating today?
              </label>
              <div className="flex items-center justify-center gap-6">
                <button
                  onClick={() => setBagCount(Math.max(1, bagCount - 1))}
                  className="bg-gray-200 hover:bg-gray-300 w-16 h-16 rounded-xl text-2xl font-bold"
                >
                  -
                </button>
                <span className="text-6xl font-bold text-indigo-600 min-w-[4rem] text-center">
                  {bagCount}
                </span>
                <button
                  onClick={() => setBagCount(bagCount + 1)}
                  className="bg-gray-200 hover:bg-gray-300 w-16 h-16 rounded-xl text-2xl font-bold"
                >
                  +
                </button>
              </div>
            </div>

            <button
              onClick={handleCheckIn}
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white text-2xl font-semibold py-6 px-8 rounded-xl transition-colors flex items-center justify-center gap-3"
            >
              {loading ? (
                <div className="animate-spin h-8 w-8 border-2 border-white border-t-transparent rounded-full"></div>
              ) : (
                <>
                  <Check className="h-8 w-8" />
                  Check In Donation
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Success View
  if (currentView === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 p-8 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-12 text-center max-w-lg">
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="h-12 w-12 text-green-600" />
          </div>
          <h2 className="text-4xl font-bold text-gray-900 mb-4">Thank You!</h2>
          <p className="text-xl text-gray-600 mb-2">
            {selectedUser.name}
          </p>
          <p className="text-lg text-gray-600 mb-6">
            {bagCount} bag{bagCount !== 1 ? 's' : ''} donated today
          </p>
          <p className="text-sm text-gray-500 mb-4">
            Total contributions: {selectedUser.total_bags} bags • {selectedUser.total_hours} volunteer hours
          </p>
          <p className="text-gray-500">
            Returning to check-in screen...
          </p>
        </div>
      </div>
    );
  }
};

export default DonorCheckin;