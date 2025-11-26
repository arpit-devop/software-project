/**
 * Main App Component
 * Root component with routing and authentication context
 */

import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Medicines from './pages/Medicines';
import Prescriptions from './pages/Prescriptions';
import Reorders from './pages/Reorders';
import Analytics from './pages/Analytics';
import Chatbot from './pages/Chatbot';
import Layout from './components/Layout';
import PrivateRoute from './components/PrivateRoute';

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route
            path="/"
            element={
              <PrivateRoute>
                <Layout />
              </PrivateRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="medicines" element={<Medicines />} />
            <Route path="prescriptions" element={<Prescriptions />} />
            <Route path="reorders" element={<Reorders />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="chatbot" element={<Chatbot />} />
          </Route>
        </Routes>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;

