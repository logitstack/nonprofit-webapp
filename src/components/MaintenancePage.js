import React from 'react';
import { Settings, Clock, Users } from 'lucide-react';

const MaintenancePage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-emerald-50 flex items-center justify-center p-8">
      <div className="bg-white rounded-2xl shadow-xl p-12 text-center max-w-2xl mx-auto">
        <div className="w-24 h-24 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Settings className="h-12 w-12 text-indigo-600 animate-spin" />
        </div>
        
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          System Maintenance
        </h1>
        
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="h-8 w-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <Users className="h-5 w-5 text-white" />
          </div>
          <h2 className="text-xl font-semibold text-indigo-600">VolunteerHub</h2>
          <span className="text-sm text-gray-500">by DataCream</span>
        </div>
        
        <p className="text-xl text-gray-600 mb-6">
          We're currently performing security updates to keep your data safe.
        </p>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Clock className="h-5 w-5 text-blue-600" />
            <span className="font-medium text-blue-800">Estimated Downtime</span>
          </div>
          <p className="text-blue-700">15-30 minutes</p>
        </div>
        
        <div className="text-left bg-gray-50 rounded-lg p-6">
          <h3 className="font-semibold text-gray-900 mb-3">What we're doing:</h3>
          <ul className="space-y-2 text-gray-700">
            <li className="flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
              Updating security credentials
            </li>
            <li className="flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
              Implementing enhanced data protection
            </li>
            <li className="flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
              Testing system functionality
            </li>
          </ul>
        </div>
        
        <p className="text-sm text-gray-500 mt-6">
          Thank you for your patience. Your volunteer data is secure during this maintenance.
        </p>
        
        <div className="mt-8 text-xs text-gray-400">
          Questions? Contact your organization administrator
        </div>
      </div>
    </div>
  );
};

export default MaintenancePage;