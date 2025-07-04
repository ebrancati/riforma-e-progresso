import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage             from './pages/LoginPage';
import ScheduleTemplatePage  from './pages/Templates/ScheduleTemplatePage';
import BookingSetupPage      from './pages/BookingSetup/BookingSetupPage';
import BookingLinksListPage  from './pages/BookingLinks/BookingLinksListPage';
import EditBookingLinkPage from './pages/BookingLinks/EditBookingLinkPage';
import PublicDirectoryPage   from './pages/PublicDirectory/PublicDirectoryPage';
import BookingPage           from './pages/Booking/BookingPage';
import CancelBookingPage     from './pages/CancelBooking/CancelBookingPage';
import RescheduleBookingPage from './pages/RescheduleBooking/RescheduleBookingPage';
import NotFoundPage          from './pages/NotFoundPage';

import './App.css';

const App: React.FC = () => {
  return (
    <div className="App">
      <AuthProvider>
        <Router>
          <Routes>
            {/* Public Routes */}
            <Route path="/colloqui" element={<PublicDirectoryPage />} />
            <Route path="/book/:slug" element={<BookingPage />} />
            <Route path="/booking/:bookingId/cancel" element={<CancelBookingPage />} />
            <Route path="/booking/:bookingId/reschedule" element={<RescheduleBookingPage />} />
            <Route path="/login" element={<LoginPage />} />
            
            {/* Protected Admin Routes */}
            <Route path="/admin/time-slots" element={
              <ProtectedRoute>
                <ScheduleTemplatePage />
              </ProtectedRoute>
            } />
            <Route path="/admin/booking-setup" element={
              <ProtectedRoute>
                <BookingSetupPage />
              </ProtectedRoute>
            } />
            <Route path="/admin/booking-links" element={
              <ProtectedRoute>
                <BookingLinksListPage />
              </ProtectedRoute>
            } />
            <Route path="/admin/booking-links/:id/edit" element={
              <ProtectedRoute>
                <EditBookingLinkPage />
              </ProtectedRoute>
            } />
            
            {/* Default redirects */}
            <Route path="/" element={<Navigate to="/admin/booking-links" replace />} />
            <Route path="/admin" element={<Navigate to="/admin/booking-links" replace />} />
            
            {/* 404 page */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Router>
      </AuthProvider>
    </div>
  );
};

export default App;