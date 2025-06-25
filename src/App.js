import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import DonorPage from './pages/DonorPage';
import VolunteerPage from './pages/VolunteerPage';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<DonorPage />} />
          <Route path="/donor-checkin" element={<DonorPage />} />
          <Route path="/volunteer-checkin" element={<VolunteerPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;