import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useParams } from 'react-router-dom';
import { CheckCircle2, Shield, X } from 'lucide-react';
import UnifiedApp from './components/UnifiedApp';
import DonorPage from './pages/DonorPage';
import VolunteerPage from './pages/VolunteerPage';
import StaffPage from './pages/StaffPage';
import { db } from './utils/database';
import VolunteerRegistration from './components/VolunteerRegistration';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          {/* New unified interface - main entry point */}
          <Route path="/" element={<UnifiedApp />} />
          <Route path="/home" element={<UnifiedApp />} />
          
          {/* Individual interfaces - still accessible via direct URLs */}
          <Route path="/donor-checkin" element={<DonorPage />} />
          <Route path="/volunteer-checkin" element={<VolunteerPage />} />
          <Route path="/staff" element={<StaffPage />} />
          
          {/* Waiver signing route for parents/guardians */}
          <Route path="/waiver/:token" element={<WaiverSigning />} />
          <Route path="/volunteer-register" element={<VolunteerRegistration />} />
        </Routes>
      </div>
    </Router>
  );
}

// Simple waiver signing component for parents/guardians
const WaiverSigning = () => {
  const { token } = useParams();
  const [loading, setLoading] = useState(false);
  const [waiverRequest, setWaiverRequest] = useState(null);
  const [signed, setSigned] = useState(false);
  const [parentName, setParentName] = useState('');

  useEffect(() => {
    const loadWaiver = async () => {
      try {
        const request = await db.getWaiverRequest(token);
        setWaiverRequest(request);
      } catch (error) {
        console.error('Error loading waiver:', error);
        setWaiverRequest({ expired: true });
      }
    };
    loadWaiver();
  }, [token]);

  const handleSign = async () => {
    if (!parentName.trim()) {
      alert('Please enter your full name to sign the waiver.');
      return;
    }

    setLoading(true);
    try {
      const success = await db.signParentWaiver(token, parentName);
      
      if (success) {
        setSigned(true);
      } else {
        alert('Error signing waiver. Please try again or contact the organization.');
      }
    } catch (error) {
      console.error('Error signing waiver:', error);
      alert('Error signing waiver. Please try again or contact the organization.');
    }
    setLoading(false);
  };

  if (!waiverRequest) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-indigo-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>Loading waiver...</p>
        </div>
      </div>
    );
  }

  if (waiverRequest.expired) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <X className="h-8 w-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Waiver Expired</h1>
          <p className="text-gray-600 mb-6">
            This waiver link has expired. Please contact the organization to request a new waiver link.
          </p>
        </div>
      </div>
    );
  }

  if (signed) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Waiver Signed Successfully!</h1>
          <p className="text-gray-600 mb-6">
            Thank you for signing the waiver for <strong>{waiverRequest.volunteer_name}</strong>. 
            They can now participate in volunteer activities.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="h-8 w-8 text-yellow-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Parent/Guardian Waiver</h1>
            <p className="text-gray-600">
              Waiver required for: <strong>{waiverRequest?.volunteer_name}</strong>
            </p>
          </div>

          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Liability Waiver and Release</h2>
            <div className="bg-gray-50 p-6 rounded-lg max-h-64 overflow-y-auto text-sm">
              <p className="text-gray-700 mb-4">
                <strong>RELEASE AND WAIVER OF LIABILITY:</strong> I, as the parent/guardian of the above-named minor, 
                acknowledge that my child wishes to participate in volunteer activities with the organization. 
                I understand that these activities may involve certain risks and dangers.
              </p>
              <p className="text-gray-700 mb-4">
                I voluntarily allow my child to participate and acknowledge that they are participating at their own risk. 
                I agree to release, waive, discharge, and covenant not to sue the organization, its officers, agents, 
                volunteers, and employees from any and all liability, claims, demands, actions, and causes of action 
                arising out of or related to any loss, damage, or injury that may be sustained by my child while 
                participating in volunteer activities.
              </p>
              <p className="text-gray-700 mb-4">
                I understand that this waiver includes any claims based on negligence, action, or inaction of the organization. 
                I also give permission for emergency medical treatment if needed.
              </p>
              <p className="text-gray-700">
                <strong>By signing below, I acknowledge that I have read, understood, and agree to the terms of this waiver.</strong>
              </p>
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Parent/Guardian Full Name *
            </label>
            <input
              type="text"
              value={parentName}
              onChange={(e) => setParentName(e.target.value)}
              placeholder="Enter your full legal name"
              className="w-full p-4 border-2 border-gray-300 rounded-xl focus:border-yellow-500 focus:outline-none"
            />
          </div>

          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>Digital Signature:</strong> By entering your name above and clicking "Sign Waiver", 
              you are providing a legally binding digital signature equivalent to a handwritten signature.
            </p>
          </div>

          <button
            onClick={handleSign}
            disabled={!parentName.trim() || loading}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-semibold py-4 px-6 rounded-xl transition-colors"
          >
            {loading ? 'Signing...' : 'Sign Waiver and Authorize Participation'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default App;