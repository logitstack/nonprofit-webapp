import React, { useState, useEffect } from 'react';
import { Search, User, Plus, Clock, ArrowLeft, Users, CheckCircle, XCircle, Mail, Phone, AlertTriangle } from 'lucide-react';
import { db } from '../utils/database';

const VolunteerCheckin = ({ onBack }) => {
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
    dateOfBirth: '',
    profession: '',
    allowCommunication: false,
    waiverSigned: false,
    parentEmail: ''  // For minors
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
    return Math.round(hours * 4) / 4;
  };

  const calculateAge = (dateOfBirth) => {
    const today = new Date();
    const birth = new Date(dateOfBirth);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const handleUserSelect = (user) => {
  setSelectedUser(user);
  
  // If user is already checked in, go straight to action (check-out)
  if (user.is_checked_in) {
    setCurrentView('action');
  } else if (!user.waiver_signed) {
    // Only check waiver for check-in, not check-out
    setCurrentView('complete_waiver');
  } else {
    setCurrentView('action');
  }
};

  // Enhanced check-in for existing users
  const handleCheckIn = async () => {
    setLastAction('checked in');
    setLoading(true);
    
    const updatedUser = await db.checkInVolunteer(selectedUser.id);
    if (updatedUser) {
      setSelectedUser(updatedUser);
      setCurrentView('success');
      refreshData();
      await loadActiveVolunteers();
    }
    setLoading(false);
    
    setTimeout(() => {
      resetToSearch();
    }, 3000);
  };

  const handleCheckOut = async (userId = null) => {
    const targetUserId = userId || selectedUser.id;
    setLastAction('checked out');
    setLoading(true);
    
    const updatedUser = await db.checkOutVolunteer(targetUserId);
    if (updatedUser) {
      if (!userId) {
        setSelectedUser(updatedUser);
        setCurrentView('success');
      }
      refreshData();
      await loadActiveVolunteers();
    }
    setLoading(false);
    
    if (!userId) {
      setTimeout(() => {
        resetToSearch();
      }, 3000);
    }
  };

  // Enhanced registration with communication opt-in and waiver
  const handleRegister = async () => {
    // Check if user is under 18 and needs parent waiver
    const age = formData.dateOfBirth ? calculateAge(formData.dateOfBirth) : null;
    const isMinor = age && age < 18;
    
    if (isMinor && !formData.parentEmail) {
      alert('Please provide a parent/guardian email address for waiver signing.');
      return;
    }
    
    if (!isMinor && !formData.waiverSigned) {
      alert('Please sign the waiver to continue.');
      return;
    }

    setLastAction('checked in');
    setLoading(true);
    
    try {
      // Create user with enhanced data
      const newUser = await db.createUser({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        city: formData.city,
        organization: formData.organization,
        dateOfBirth: formData.dateOfBirth,
        profession: formData.profession,
        allowCommunication: formData.allowCommunication,
        waiverSigned: !isMinor ? formData.waiverSigned : false,
        parentEmail: isMinor ? formData.parentEmail : null,
        isMinor: isMinor
      });
      
      if (newUser) {
  // All users (adults and minors with signed waivers) can check in immediately
  const updatedUser = await db.checkInVolunteer(newUser.id);
  if (updatedUser) {
    setSelectedUser(updatedUser);
    setCurrentView('success');
    refreshData();
    await loadActiveVolunteers();
  }
}
    } catch (error) {
      console.error('Registration error:', error);
      alert('Registration failed. Please try again.');
    }
    
    setLoading(false);
    
    // Reset form
    setFormData({
      name: '',
      email: '',
      phone: '',
      city: '',
      organization: '',
      dateOfBirth: '',
      profession: '',
      allowCommunication: false,
      waiverSigned: false,
      parentEmail: ''
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

  // Search View with Easy Checkout Buttons
  if (currentView === 'search') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 p-8">
        <div className="max-w-2xl mx-auto">
          {/* Back button if onBack is provided */}
          {onBack && (
            <button
              onClick={onBack}
              className="mb-6 flex items-center gap-2 text-emerald-600 hover:text-emerald-800 text-lg"
            >
              <ArrowLeft className="h-5 w-5" />
              Back to Home
            </button>
          )}

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

          {/* Enhanced Active Volunteers List with Easy Checkout */}
          {activeVolunteers.length > 0 && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-6">
              <h3 className="font-semibold text-emerald-800 mb-3">Currently Checked In:</h3>
              <div className="space-y-3">
                {activeVolunteers.map(volunteer => (
                  <div key={volunteer.id} className="flex justify-between items-center bg-white rounded-lg p-3 shadow-sm">
                    <div className="flex-1">
                      <span className="text-emerald-700 font-medium">{volunteer.name}</span>
                      <div className="text-sm text-emerald-600">
                        {calculateHours(volunteer.last_check_in)}h today • Since {formatTime(volunteer.last_check_in)}
                      </div>
                    </div>
                    <button
                      onClick={() => handleCheckOut(volunteer.id)}
                      disabled={loading}
                      className="bg-red-500 hover:bg-red-600 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                    >
                      <XCircle className="h-4 w-4" />
                      Check Out
                    </button>
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
                          {user.allow_communication && (
                            <Mail className="h-4 w-4 text-blue-500" title="Allows communication" />
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

  // Enhanced Registration View with Communication Opt-in and Waiver
  if (currentView === 'register') {
    const age = formData.dateOfBirth ? calculateAge(formData.dateOfBirth) : null;
    const isMinor = age && age < 18;
    
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
              <select
                value={formData.profession}
                onChange={(e) => setFormData({...formData, profession: e.target.value})}
                className="w-full p-4 text-lg border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:outline-none"
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
              
              <div className="relative">
                <input
                  type="date"
                  id="dateOfBirth"
                  value={formData.dateOfBirth}
                  onChange={(e) => setFormData({...formData, dateOfBirth: e.target.value})}
                  className="w-full p-4 text-lg border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:outline-none peer placeholder-transparent"
                  placeholder=" "
                />
                <label 
                  htmlFor="dateOfBirth"
                  className="absolute text-sm text-gray-500 duration-300 transform -translate-y-4 scale-75 top-2 z-10 origin-[0] bg-white px-2 peer-focus:px-2 peer-focus:text-emerald-600 peer-placeholder-shown:scale-100 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:top-1/2 peer-focus:top-2 peer-focus:scale-75 peer-focus:-translate-y-4 left-3"
                >
                  Date of Birth *
                </label>
              </div>

              {age && (
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    Age: {age} years old {isMinor && '(Minor - parent waiver required)'}
                  </p>
                </div>
              )}

              {/* In-Person Parent Waiver for Minors */}
              {isMinor && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                  <h4 className="font-semibold text-yellow-800 mb-2 flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    Parent/Guardian Must Be Present
                  </h4>
                  <input
                    type="text"
                    placeholder="Parent/Guardian Full Name *"
                    value={formData.parentEmail} // Reusing this field for parent name
                    onChange={(e) => setFormData({...formData, parentEmail: e.target.value})}
                    className="w-full p-3 text-lg border-2 border-yellow-300 rounded-xl focus:border-yellow-500 focus:outline-none"
                    required
                  />
                  <p className="text-sm text-yellow-700 mt-2">
                    Parent/guardian must be present to sign waiver on behalf of minor volunteer.
                  </p>
                </div>
              )}
            </div>

            {/* Communication Opt-in */}
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.allowCommunication}
                  onChange={(e) => setFormData({...formData, allowCommunication: e.target.checked})}
                  className="mt-1 h-5 w-5 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
                />
                <div>
                  <div className="font-medium text-blue-800 flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    <Phone className="h-4 w-4" />
                    Communication Preferences
                  </div>
                  <p className="text-sm text-blue-700 mt-1">
                    I agree to receive SMS and email communications about volunteering events, 
                    upcoming programs, and organization updates. You can opt out at any time.
                  </p>
                </div>
              </label>
            </div>

            {/* Adult Waiver Section */}
            {!isMinor && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                <h4 className="font-semibold text-red-800 mb-3">Liability Waiver</h4>
                <div className="bg-white p-4 rounded-lg border border-red-200 max-h-32 overflow-y-auto text-sm mb-3">
                  <p className="text-gray-700">
                    <strong>RELEASE AND WAIVER OF LIABILITY:</strong> I voluntarily participate in volunteer 
                    activities and acknowledge that I am participating at my own risk. I agree to release, 
                    waive, discharge, and covenant not to sue the organization, its officers, agents, 
                    volunteers, and employees from any and all liability, claims, demands, actions, and 
                    causes of action arising out of or related to any loss, damage, or injury that may be 
                    sustained by me while participating in volunteer activities. I understand that this 
                    waiver includes any claims based on negligence, action, or inaction of the organization.
                  </p>
                </div>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.waiverSigned}
                    onChange={(e) => setFormData({...formData, waiverSigned: e.target.checked})}
                    className="mt-1 h-5 w-5 text-red-600 rounded border-gray-300 focus:ring-red-500"
                  />
                  <span className="text-sm text-red-800">
                    I have read, understood, and agree to the terms of this liability waiver. *
                  </span>
                </label>
              </div>
            )}

            {/* In-Person Parent Waiver for Minors */}
            {isMinor && (
              <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                <h4 className="font-semibold text-yellow-800 mb-3">Parent/Guardian Waiver (In-Person)</h4>
                <div className="bg-white p-4 rounded-lg border border-yellow-200 max-h-32 overflow-y-auto text-sm mb-3">
                  <p className="text-gray-700">
                    <strong>PARENT/GUARDIAN WAIVER:</strong> I, as the parent/guardian of the above-named minor, 
                    being present during this registration, acknowledge that my child wishes to participate in volunteer 
                    activities. I voluntarily allow my child to participate at their own risk. I agree to release, 
                    waive, discharge, and covenant not to sue the organization from any and all liability arising 
                    from my child's participation in volunteer activities.
                  </p>
                </div>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.waiverSigned}
                    onChange={(e) => setFormData({...formData, waiverSigned: e.target.checked})}
                    className="mt-1 h-5 w-5 text-yellow-600 rounded border-gray-300 focus:ring-yellow-500"
                  />
                  <span className="text-sm text-yellow-800">
                    I, {formData.parentEmail || '[Parent Name]'}, as parent/guardian, have read and agree to this waiver on behalf of my minor child. *
                  </span>
                </label>
              </div>
            )}

            <div className="mb-6 p-4 bg-emerald-50 rounded-xl text-center">
              <Clock className="mx-auto h-8 w-8 text-emerald-600 mb-2" />
              <p className="text-emerald-800 font-medium">
                You'll be automatically checked in at {formatTime(currentTime)}
              </p>
            </div>

            <button
              onClick={handleRegister}
              disabled={
                !formData.name || 
                !formData.email || 
                !formData.phone || 
                !formData.dateOfBirth ||
                (isMinor && !formData.parentEmail) ||
                !formData.waiverSigned || // Both adults and minors need waiver signed
                loading
              }
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

  // Waiver Pending View (for minors)
  if (currentView === 'waiver_pending') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-100 p-8 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-12 text-center max-w-lg">
          <div className="w-24 h-24 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Mail className="h-12 w-12 text-yellow-600" />
          </div>
          <h2 className="text-4xl font-bold text-gray-900 mb-4">Registration Complete!</h2>
          <p className="text-xl text-gray-600 mb-2">
            {formData.name}
          </p>
          <p className="text-lg text-yellow-600 mb-6">
            Waiver email sent to parent/guardian
          </p>
          <p className="text-sm text-gray-500 mb-4">
            You can check in once your parent/guardian signs the waiver via the email link.
          </p>
          <p className="text-gray-500">
            Returning to check-in screen...
          </p>
        </div>
      </div>
    );
  }

  // Waiver Completion View (for existing users without waivers)
  if (currentView === 'complete_waiver') {
    const userAge = selectedUser.date_of_birth ? calculateAge(new Date(selectedUser.date_of_birth)) : null;
    const isMinor = userAge && userAge < 18;
    
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
            <div className="text-center mb-6">
              <AlertTriangle className="mx-auto h-12 w-12 text-yellow-600 mb-4" />
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Waiver Required</h2>
              <p className="text-xl text-gray-600">Hi {selectedUser.name}! You need to complete your waiver to volunteer.</p>
              {selectedUser.total_bags > 0 && selectedUser.total_hours === 0 && (
                <p className="text-sm text-blue-600 mt-2">
                  We see you're a donor wanting to volunteer - that's great! Just need your waiver first.
                </p>
              )}
            </div>

            {/* Parent name input for minors */}
            {isMinor && (
              <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                <h4 className="font-semibold text-yellow-800 mb-2 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Parent/Guardian Must Be Present
                </h4>
                <input
                  type="text"
                  placeholder="Parent/Guardian Full Name *"
                  value={formData.parentEmail} // Reusing for parent name
                  onChange={(e) => setFormData({...formData, parentEmail: e.target.value})}
                  className="w-full p-3 text-lg border-2 border-yellow-300 rounded-xl focus:border-yellow-500 focus:outline-none"
                  required
                />
              </div>
            )}

            {/* Adult Waiver */}
            {!isMinor && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                <h4 className="font-semibold text-red-800 mb-3">Liability Waiver</h4>
                <div className="bg-white p-4 rounded-lg border border-red-200 max-h-32 overflow-y-auto text-sm mb-3">
                  <p className="text-gray-700">
                    <strong>RELEASE AND WAIVER OF LIABILITY:</strong> I voluntarily participate in volunteer 
                    activities and acknowledge that I am participating at my own risk. I agree to release, 
                    waive, discharge, and covenant not to sue the organization, its officers, agents, 
                    volunteers, and employees from any and all liability, claims, demands, actions, and 
                    causes of action arising out of or related to any loss, damage, or injury that may be 
                    sustained by me while participating in volunteer activities.
                  </p>
                </div>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.waiverSigned}
                    onChange={(e) => setFormData({...formData, waiverSigned: e.target.checked})}
                    className="mt-1 h-5 w-5 text-red-600 rounded border-gray-300 focus:ring-red-500"
                  />
                  <span className="text-sm text-red-800">
                    I have read, understood, and agree to the terms of this liability waiver. *
                  </span>
                </label>
              </div>
            )}

            {/* Minor Parent Waiver */}
            {isMinor && (
              <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                <h4 className="font-semibold text-yellow-800 mb-3">Parent/Guardian Waiver (In-Person)</h4>
                <div className="bg-white p-4 rounded-lg border border-yellow-200 max-h-32 overflow-y-auto text-sm mb-3">
                  <p className="text-gray-700">
                    <strong>PARENT/GUARDIAN WAIVER:</strong> I, as the parent/guardian of {selectedUser.name}, 
                    being present during this waiver completion, acknowledge that my child wishes to participate in volunteer 
                    activities. I voluntarily allow my child to participate at their own risk. I agree to release, 
                    waive, discharge, and covenant not to sue the organization from any and all liability arising 
                    from my child's participation in volunteer activities.
                  </p>
                </div>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.waiverSigned}
                    onChange={(e) => setFormData({...formData, waiverSigned: e.target.checked})}
                    className="mt-1 h-5 w-5 text-yellow-600 rounded border-gray-300 focus:ring-yellow-500"
                  />
                  <span className="text-sm text-yellow-800">
                    I, {formData.parentEmail || '[Parent Name]'}, as parent/guardian, have read and agree to this waiver on behalf of {selectedUser.name}. *
                  </span>
                </label>
              </div>
            )}

            <button
              onClick={async () => {
                if (!formData.waiverSigned) {
                  alert('Please complete the waiver to continue.');
                  return;
                }
                if (isMinor && !formData.parentEmail) {
                  alert('Please enter parent/guardian name.');
                  return;
                }

                setLoading(true);
                
                // Update user with waiver completion
                const updates = {
                  waiver_signed: true,
                  waiver_signed_at: new Date().toISOString()
                };
                
                if (isMinor) {
                  updates.parent_email = formData.parentEmail; // Store parent name
                }
                
                const updatedUser = await db.updateUser(selectedUser.id, updates);
                
                if (updatedUser) {
                  setSelectedUser(updatedUser);
                  setCurrentView('action');
                  alert('Waiver completed! You can now check in.');
                } else {
                  alert('Error updating waiver. Please try again.');
                }
                
                setLoading(false);
              }}
              disabled={!formData.waiverSigned || (isMinor && !formData.parentEmail) || loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white text-xl font-semibold py-4 px-6 rounded-xl transition-colors flex items-center justify-center gap-3"
            >
              {loading ? (
                <div className="animate-spin h-6 w-6 border-2 border-white border-t-transparent rounded-full"></div>
              ) : (
                <>
                  <CheckCircle className="h-6 w-6" />
                  Complete Waiver & Continue to Check-In
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
              {selectedUser.allow_communication && (
                <p className="text-sm text-blue-600 flex items-center justify-center gap-1">
                  <Mail className="h-4 w-4" />
                  Subscribed to communications
                </p>
              )}
              <p className="text-lg font-medium text-gray-700 mt-2">
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