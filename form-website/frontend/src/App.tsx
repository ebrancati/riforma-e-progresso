// src/App.tsx - ADD booking route
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ScheduleTemplatePage from './pages/Templates/ScheduleTemplatePage';
import BookingSetupPage from './pages/BookingSetup/BookingSetupPage';
import BookingLinksListPage from './pages/BookingLinks/BookingLinksListPage';
import BookingPage from './pages/Booking/BookingPage';  // ← NEW IMPORT
import NotFoundPage from './pages/NotFoundPage';
import './App.css';

const App: React.FC = () => {
  return (
    <div className="App">
      <Router>
        <Routes>
          {/* Admin Routes */}
          <Route path="/admin/time-slots" element={<ScheduleTemplatePage />} />
          <Route path="/admin/booking-setup" element={<BookingSetupPage />} />
          <Route path="/admin/booking-links" element={<BookingLinksListPage />} />
          
          {/* Public Booking Route */}
          <Route path="/book/:slug" element={<BookingPage />} />
          
          {/* Redirect to time-slots for now */}
          <Route path="/" element={<Navigate to="/admin/time-slots" replace />} />
          
          {/* 404 page */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Router>
    </div>
  );
};

export default App;