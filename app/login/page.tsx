"use client";

import React, { useState } from "react";
import LoginForm from "../../sharecomponent/navbar/login-sinup/loginForm";

const LoginPage = () => {
  const [showForm, setShowForm] = useState(true);

  return (
    <div className="flex items-center justify-center h-screen bg-gray-100">
      {showForm && (
        <LoginForm
          onClose={() => setShowForm(false)}
          onLoginSuccess={() => {
            window.location.href = "/";
          }}
        />
      )}
    </div>
  );
};

export default LoginPage;
