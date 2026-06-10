import { useEffect, useState, useCallback, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { VerifyEmail } from './pages/VerifyEmail';
import { ForgotPassword } from './pages/ForgotPassword';
import { ResetPassword } from './pages/ResetPassword';
import { Home } from './pages/Home';
import { Watch } from './pages/Watch';
import { FocusProvider } from './context/FocusContext';
import { MuteProvider } from './context/MuteContext';

function HistoryClearer() {
  const navigate = useNavigate();
  const historyCleared = useRef(false);
  
  useEffect(() => {
    if (!historyCleared.current) {
      historyCleared.current = true;
      try {
        window.history.pushState(null, '', '/');
        window.history.replaceState(null, '', '/');
      } catch {
      }
    }
  }, [navigate]);

  return null;
}

function App() {
  const [user, setUser] = useState<any>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  const checkAuth = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:5001/api/auth/check-auth', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setUser(data.user);
        setIsAuthenticated(true);
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (err) {
      console.error('Check auth failed:', err);
      setUser(null);
      setIsAuthenticated(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const handleLoginSuccess = (loggedInUser: any) => {
    setUser(loggedInUser);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setUser(null);
    setIsAuthenticated(false);
  };

  // Auth checking loading screen (Netflix style spinner)
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center">
        <span className="loading loading-spinner loading-lg text-red-600"></span>
      </div>
    );
  }

  return (
    <MuteProvider>
      <FocusProvider>
        <BrowserRouter>
          <HistoryClearer />
          <Routes>
            {/* Landing Root Check */}
            <Route 
              path="/" 
              element={
                isAuthenticated ? (
                  user?.isVerified ? <Navigate to="/home" replace /> : <Navigate to="/verify-email" replace />
                ) : (
                  <Navigate to="/login" replace />
                )
              } 
            />

            {/* Login Route */}
            <Route 
              path="/login" 
              element={
                isAuthenticated ? (
                  user?.isVerified ? <Navigate to="/home" replace /> : <Navigate to="/verify-email" replace />
                ) : (
                  <Login onLoginSuccess={handleLoginSuccess} />
                )
              } 
            />

            {/* Signup Route */}
            <Route 
              path="/signup" 
              element={
                isAuthenticated ? (
                  user?.isVerified ? <Navigate to="/home" replace /> : <Navigate to="/verify-email" replace />
                ) : (
                  <Signup onSignupSuccess={handleLoginSuccess} />
                )
              } 
            />

            {/* Verify Email Route */}
            <Route 
              path="/verify-email" 
              element={
                isAuthenticated ? (
                  user?.isVerified ? <Navigate to="/home" replace /> : <VerifyEmail onVerificationSuccess={handleLoginSuccess} />
                ) : (
                  <Navigate to="/login" replace />
                )
              } 
            />

            {/* Forgot Password Route */}
            <Route 
              path="/forgot-password" 
              element={
                isAuthenticated ? (
                  user?.isVerified ? <Navigate to="/home" replace /> : <Navigate to="/verify-email" replace />
                ) : (
                  <ForgotPassword />
                )
              } 
            />

            {/* Reset Password Route */}
            <Route 
              path="/reset-password/:token" 
              element={
                isAuthenticated ? (
                  user?.isVerified ? <Navigate to="/home" replace /> : <Navigate to="/verify-email" replace />
                ) : (
                  <ResetPassword />
                )
              } 
            />

            {/* Home Route */}
            <Route 
              path="/home" 
              element={
                isAuthenticated ? (
                  user?.isVerified ? (
                    <Home user={user} onLogout={handleLogout} />
                  ) : (
                    <Navigate to="/verify-email" replace />
                  )
                ) : (
                  <Navigate to="/login" replace />
                )
              } 
            />

            {/* Movie Detail Route */}
            <Route 
              path="/:tmdbId" 
              element={
                isAuthenticated ? (
                  user?.isVerified ? (
                    <Home user={user} onLogout={handleLogout} />
                  ) : (
                    <Navigate to="/verify-email" replace />
                  )
                ) : (
                  <Navigate to="/login" replace />
                )
              } 
            />

            {/* Playback Routes */}
            <Route 
              path="/watch/:type/:tmdbId" 
              element={
                isAuthenticated ? (
                  user?.isVerified ? (
                    <Watch />
                  ) : (
                    <Navigate to="/verify-email" replace />
                  )
                ) : (
                  <Navigate to="/login" replace />
                )
              } 
            />
            <Route 
              path="/watch/:type/:tmdbId/:season/:episode" 
              element={
                isAuthenticated ? (
                  user?.isVerified ? (
                    <Watch />
                  ) : (
                    <Navigate to="/verify-email" replace />
                  )
                ) : (
                  <Navigate to="/login" replace />
                )
              } 
            />

            {/* Catch All Redirect */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </FocusProvider>
    </MuteProvider>
  );
}

export default App;
