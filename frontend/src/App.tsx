import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Provider } from 'jotai';
import AppointmentForm from './components/AppointmentForm';

function App() {
  return (
    <Provider>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Routes>
            <Route path="/appointments/:id" element={<AppointmentForm />} />
            <Route path="/" element={
              <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                  <h1 className="text-2xl font-bold text-gray-900 mb-4">
                    Appointment Lock System
                  </h1>
                  <p className="text-gray-600">
                    Navigate to /appointments/:id to test the locking system
                  </p>
                </div>
              </div>
            } />
          </Routes>
        </div>
      </Router>
    </Provider>
  );
}

export default App;