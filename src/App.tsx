import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProgressProvider } from './context/ProgressContext';
import ProtectedRoute from './components/ProtectedRoute';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import CourseViewer from './pages/CourseViewer';
import Dashboard from './pages/Dashboard';

/**
 * Root Application Router with Firebase Authentication & Route Guards
 */
const App: React.FC = () => {
    return (
        <Router>
            <AuthProvider>
                <ProgressProvider>
                    <Routes>
                        {/* Public Landing & Marketing */}
                        <Route path="/" element={<LandingPage />} />

                        {/* Authentication Portal */}
                        <Route path="/login" element={<LoginPage />} />

                        {/* Protected Executive Dashboard */}
                        <Route
                            path="/dashboard"
                            element={
                                <ProtectedRoute>
                                    <Dashboard />
                                </ProtectedRoute>
                            }
                        />

                        {/* Protected Executive Course Viewer */}
                        <Route
                            path="/programs/business-english"
                            element={
                                <ProtectedRoute>
                                    <CourseViewer />
                                </ProtectedRoute>
                            }
                        />

                        {/* Graceful Fallback for Unmatched Routes */}
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </ProgressProvider>
            </AuthProvider>
        </Router>
    );
};

export default App;
