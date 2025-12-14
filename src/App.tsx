import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LoginForm } from "./components/auth/LoginForm";
import { SignupForm } from "./components/auth/SignupForm";
import { useAuth } from "./hooks/useAuth";
import { Dashboard } from "./components/dashboard/Dashboard";
import Customers from "./components/customers";
import CustomerProfile from "./components/CustomerProfile";
import Treasury from "./components/Treasury";

import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

function App() {
  const { user, loading, signIn, signUp } = useAuth();
  const [isLogin, setIsLogin] = useState(true);

  // Loader while auth state is resolving
  if (loading) {
    return (
  <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-50 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
             <div className="w-16 h-16 bg-gradient-to-r from-[#212E5B] to-[#212E5B] rounded-2xl mx-auto mb-4 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-white border-t-transparent"></div>
          </div>
          <p className="text-gray-600">جاري التحميل...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        {/* Dashboard route */}
        <Route path="/dashboard" element={<Dashboard />} />

        {/* Root route */}
        <Route
          path="/"
          element={
            user ? (
              <Dashboard />
            ) : (
              <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
                {/* Background blobs */}
                <div className="absolute inset-0 overflow-hidden">
                  <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-100 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
                  <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
                  <div className="absolute top-40 left-40 w-80 h-80 bg-primary-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
                </div>

                <div className="relative z-10 w-full max-w-md">
                  <AnimatePresence mode="wait">
                    {isLogin ? (
                      <LoginForm
                        key="login"
                        onLogin={signIn}
                        onSwitchToSignup={() => setIsLogin(false)}
                        loading={loading}
                      />
                    ) : (
                      <SignupForm
                        key="signup"
                        onSignup={signUp}
                        onSwitchToLogin={() => setIsLogin(true)}
                        loading={loading}
                      />
                    )}
                  </AnimatePresence>
                </div>
              </div>
            )
          }
        />

        {/* Customers route */}
        <Route path="/customers" element={<Customers />} />
        {/* Customers profile */}
        <Route path="/customer-profile/:id" element={<CustomerProfile />} />
        {/* treasury page */}
        <Route path="/treasury" element={<Treasury />} />


      </Routes>
    </Router>
  );
}

export default App;
