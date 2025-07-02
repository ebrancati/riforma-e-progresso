import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ScheduleTemplatePage from './pages/Templates/ScheduleTemplatePage';
import NotFoundPage from './pages/NotFoundPage';
import './App.css';

const App: React.FC = () => {
  return (
    <div className="App">
      <Router>
        <Routes>
          {/* Time Slots Management */}
          <Route path="/admin/time-slots" element={<ScheduleTemplatePage />} />
          
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