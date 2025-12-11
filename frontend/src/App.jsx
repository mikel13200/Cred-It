import React from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import { HomePage as StudentHome, StudentDocumentPage } from './pages/student';
import {
  DepartmentHome,
  DocumentPage,
  FinalDocumentPage,
  RequestPage,
} from './pages/faculty';
import { StudentRoute, FacultyRoute } from './components/common';
import { AuthProvider, NotificationProvider } from './context';
import AuthCallback from './features/auth/components/AuthCallback';

function AppContent() {
  return (
    <Routes>
      {/* Public Route */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/auth/callback" element={<AuthCallback />} />

      {/* Protected Student Routes */}
      <Route
        path="/HomePage"
        element={
          <StudentRoute>
            <StudentHome />
          </StudentRoute>
        }
      />
      <Route
        path="/student/finalDocument/:id"
        element={
          <StudentRoute>
            <StudentDocumentPage />
          </StudentRoute>
        }
      />

      {/* Protected Faculty Routes */}
      <Route
        path="/DepartmentHome"
        element={
          <FacultyRoute>
            <DepartmentHome />
          </FacultyRoute>
        }
      />
      <Route
        path="/request/:id"
        element={
          <FacultyRoute>
            <RequestPage />
          </FacultyRoute>
        }
      />
      <Route
        path="/document/:id"
        element={
          <FacultyRoute>
            <DocumentPage />
          </FacultyRoute>
        }
      />
      <Route
        path="/finalDocument/:id"
        element={
          <FacultyRoute>
            <FinalDocumentPage />
          </FacultyRoute>
        }
      />

      {/* Catch all - redirect to landing */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}


function App() {
  // Replace with your actual Google Client ID from Google Cloud Console
  const GOOGLE_CLIENT_ID = "860757277869-oncacfs23f3h40hhj0sliiq8chdo88cv.apps.googleusercontent.com.apps.googleusercontent.com";

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <Router>
        <AuthProvider>
          <NotificationProvider>
            <AppContent />
          </NotificationProvider>
        </AuthProvider>
      </Router>
    </GoogleOAuthProvider>
  );
}

export default App;