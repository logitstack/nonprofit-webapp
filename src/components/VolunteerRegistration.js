import React, { useState } from 'react';
import { User, Plus, ArrowLeft, Users, CheckCircle, Mail, Phone, AlertTriangle, UserPlus } from 'lucide-react';
import { db } from '../utils/database';

const VolunteerRegistration = ({ onBack }) => {
  const [loading, setLoading] = useState(false);
  const [registrationComplete, setRegistrationComplete] = useState(false);
  const [completedUser, setCompletedUser] = useState(null);
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
    parentEmail: ''  // For parent name in case of minors
  });

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

  const handleRegister = async () => {
    const age = formData.dateOfBirth ? calculateAge(formData.dateOfBirth) : null;
    const isMinor = age && age < 18;
    
    // Validation for minors
    if (isMinor && !formData.parentEmail) {
      alert('Please provide parent/guardian name for minors.');
      return;
    }
    
    // Validation for waiver
    if (!formData.waiverSigned) {
      alert('Please complete the waiver to register.');
      return;
    }

    setLoading(true);
    
    try {
      // Create user with all data (but don't check them in)
      const newUser = await db.createUser({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        city: formData.city,
        organization: formData.organization,
        dateOfBirth: formData.dateOfBirth,
        profession: formData.profession,
        allowCommunication: formData.allowCommunication,
        waiverSigned: formData.waiverSigned,
        parentEmail: isMinor ? formData.parentEmail : null,
        isMinor: isMinor
      });
      
      if (newUser) {
        setCompletedUser(newUser);
        setRegistrationComplete(true);
        
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
      }
    } catch (error) {
      console.error('Registration error:', error);
      alert('Registration failed. Please try again.');
    }
    
    setLoading(false);
  };

  const resetToRegistration = () => {
    setRegistrationComplete(false);
    setCompletedUser(null);
  };

  // Registration Success View
  if (registrationComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-green-100 p-8 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-12 text-center max-w-lg">
          <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <UserPlus className="h-12 w-12 text-emerald-600" />
          </div>
          <h2 className="text-4xl font-bold text-gray-900 mb-4">Registration Complete!</h2>
          <p className="text-xl text-gray-600 mb-2">
            {completedUser.name}
          </p>
          <p className="text-lg text-emerald-600 mb-6">
            Successfully registered as volunteer
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-blue-800 mb-2">What's Next?</h3>
            <p className="text-sm text-blue-700">
              You're all set! When you arrive to volunteer, simply search for your name 
              in the <strong>Volunteer Check-In</strong> system and you'll be able to check in immediately.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={resetToRegistration}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
            >
              Register Another Volunteer
            </button>
            {onBack && (
              <button
                onClick={onBack}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-3 px-4 rounded-lg transition-colors"
              >
                Back to Home
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Main Registration Form
  const age = formData.dateOfBirth ? calculateAge(formData.dateOfBirth) : null;
  const isMinor = age && age < 18;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-2xl mx-auto">
        {/* Back button if onBack is provided */}
        {onBack && (
          <button
            onClick={onBack}
            className="mb-6 flex items-center gap-2 text-indigo-600 hover:text-indigo-800 text-lg"
          >
            <ArrowLeft className="h-5 w-5" />
            Back to Home
          </button>
        )}

        <div className="text-center mb-8">
          <UserPlus className="mx-auto h-16 w-16 text-indigo-600 mb-4" />
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Volunteer Registration</h1>
          <p className="text-xl text-gray-600">Register in advance for future volunteer opportunities</p>
          <div className="mt-4 p-4 bg-white rounded-xl shadow-sm">
            <p className="text-sm text-indigo-600">
              💡 <strong>Perfect for groups!</strong> Register from home, then check in when you arrive to volunteer.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Volunteer Information</h2>
          
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
            <select
              value={formData.profession}
              onChange={(e) => setFormData({...formData, profession: e.target.value})}
              className="w-full p-4 text-lg border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none"
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
                className="w-full p-4 text-lg border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none peer placeholder-transparent"
                placeholder=" "
              />
              <label 
                htmlFor="dateOfBirth"
                className="absolute text-sm text-gray-500 duration-300 transform -translate-y-4 scale-75 top-2 z-10 origin-[0] bg-white px-2 peer-focus:px-2 peer-focus:text-indigo-600 peer-placeholder-shown:scale-100 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:top-1/2 peer-focus:top-2 peer-focus:scale-75 peer-focus:-translate-y-4 left-3"
              >
                Date of Birth *
              </label>
            </div>

            {age && (
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  Age: {age} years old {isMinor && '(Minor - parent/guardian info required)'}
                </p>
              </div>
            )}

            {/* Parent name for minors */}
            {isMinor && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                <h4 className="font-semibold text-yellow-800 mb-2 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Parent/Guardian Information
                </h4>
                <input
                  type="text"
                  placeholder="Parent/Guardian Full Name *"
                  value={formData.parentEmail}
                  onChange={(e) => setFormData({...formData, parentEmail: e.target.value})}
                  className="w-full p-3 text-lg border-2 border-yellow-300 rounded-xl focus:border-yellow-500 focus:outline-none"
                  required
                />
                <p className="text-sm text-yellow-700 mt-2">
                  Parent/guardian must be present when minor arrives to volunteer and will need to confirm waiver at that time.
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
                className="mt-1 h-5 w-5 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
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

          {/* Minor Parent Waiver */}
          {isMinor && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
              <h4 className="font-semibold text-yellow-800 mb-3">Parent/Guardian Pre-Waiver Agreement</h4>
              <div className="bg-white p-4 rounded-lg border border-yellow-200 max-h-32 overflow-y-auto text-sm mb-3">
                <p className="text-gray-700">
                  <strong>PARENT/GUARDIAN PRE-AGREEMENT:</strong> I, as the parent/guardian of the above-named minor, 
                  acknowledge that my child wishes to register for volunteer activities. I understand that a 
                  formal waiver will need to be completed when my child arrives to volunteer, and that I or 
                  another authorized guardian must be present at that time to complete the waiver process.
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
                  I understand the waiver requirements and agree to complete the formal waiver when my child arrives to volunteer. *
                </span>
              </label>
            </div>
          )}

          <div className="mb-6 p-4 bg-indigo-50 rounded-xl text-center">
            <UserPlus className="mx-auto h-8 w-8 text-indigo-600 mb-2" />
            <p className="text-indigo-800 font-medium">
              You'll be registered and ready to check in when you arrive to volunteer!
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
              !formData.waiverSigned ||
              loading
            }
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white text-xl font-semibold py-4 px-6 rounded-xl transition-colors flex items-center justify-center gap-3"
          >
            {loading ? (
              <div className="animate-spin h-6 w-6 border-2 border-white border-t-transparent rounded-full"></div>
            ) : (
              <>
                <UserPlus className="h-6 w-6" />
                Complete Registration
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default VolunteerRegistration;