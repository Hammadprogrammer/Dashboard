"use client";
import React, { useState } from "react";

type LoginFormProps = {
  onClose: () => void;
  onLoginSuccess?: () => void;
};

export default function LoginForm({ onClose, onLoginSuccess }: LoginFormProps) {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = String(formData.get("email"));
    const password = String(formData.get("password"));

    try {
      const res = await fetch("http://localhost:3000/api/users/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok && data.token) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("isLoggedIn", "true");
        onLoginSuccess?.();
        onClose();
      } else {
        setError(data.error || "Invalid credentials!");
      }
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-900 via-gray-900 to-black bg-opacity-95 flex items-center justify-center z-50 p-4">
      <div className="bg-white p-10 rounded-2xl shadow-2xl w-full max-w-md animate-fade-in-up">
        <h2 className="text-3xl font-extrabold text-center text-gray-900 mb-2">
          Welcome 
        </h2>
        <p className="text-gray-600 mb-8 text-center text-lg">
          Please log in to continue
        </p>

        <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
          <input
            type="email"
            name="email"
            placeholder="Enter your email"
            required
            className="w-full px-5 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow text-gray-800 placeholder-gray-400 shadow-sm"
          />
          <input
            type="password"
            name="password"
            placeholder="Enter your password"
            required
            className="w-full px-5 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow text-gray-800 placeholder-gray-400 shadow-sm"
          />

          {error && <p className="text-red-600 text-sm mt-1">{error}</p>}

          <button
            type="submit"
            className="w-full bg-blue-600 text-white font-semibold py-3 rounded-lg shadow-md hover:bg-blue-700 transition-colors disabled:bg-blue-300 disabled:cursor-not-allowed"
            disabled={loading}
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}
