import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import DonorPage from './pages/DonorPage';
import VolunteerPage from './pages/VolunteerPage';
import StaffPage from './pages/StaffPage';  // Add this import

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<DonorPage />} />
          <Route path="/donor-checkin" element={<DonorPage />} />
          <Route path="/volunteer-checkin" element={<VolunteerPage />} />
          <Route path="/staff" element={<StaffPage />} /> 
        </Routes>
      </div>
    </Router>
  );
}

export default App;