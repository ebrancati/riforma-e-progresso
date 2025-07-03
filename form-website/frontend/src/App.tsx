import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ScheduleTemplatePage from './pages/Templates/ScheduleTemplatePage';
import BookingSetupPage     from './pages/BookingSetup/BookingSetupPage';
import BookingLinksListPage from './pages/BookingLinks/BookingLinksListPage';
import BookingCalendarPage  from './pages/Booking/BookingCalendarPage';
import BookingTimeSlotsPage from './pages/Booking/BookingTimeSlotsPage';
import BookingFormPage      from './pages/Booking/BookingFormPage';
import NotFoundPage         from './pages/NotFoundPage';
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
          
          {/* Public Booking Routes */}
          <Route path="/book/:slug" element={<BookingCalendarPage />} />
          <Route path="/book/:slug/slots/:date" element={<BookingTimeSlotsPage />} />
          <Route path="/book/:slug/form" element={<BookingFormPage />} />
          
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