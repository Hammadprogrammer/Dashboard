// file: components/Navbar.jsx

"use client";
import React, { useState, useEffect } from "react";
import { FaTimes } from "react-icons/fa";
import Link from "next/link";
import LoginForm from "./login-sinup/loginForm";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [loading, setLoading] = useState(true);

  // ✅ Check login status on load
  useEffect(() => {
    const storedLoginStatus = localStorage.getItem("isLoggedIn");
    if (storedLoginStatus === "true") {
      setIsLoggedIn(true);
    }
    setLoading(false);
  }, []);

  const handleHamburgerClick = () => {
    setIsOpen((prev) => !prev);
  };

  const handleCloseClick = () => {
    setIsOpen(false);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("token");

    // ✅ Refresh the page after logout
    window.location.reload();
  };

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    window.addEventListener("scroll", handleScroll);

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (loading) return null;

  return (
    <>
      <div
        className={`fixed top-0 left-0 w-full z-40 transition-all duration-300 ${
          scrolled ? "bg-black shadow-md text-white" : "bg-transparent text-white"
        }`}
      >
        <nav className="container mx-auto flex items-center justify-between p-4">
          <h1 className="font-bold text-2xl">
            <strong>Dashboard</strong>
          </h1>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button onClick={handleHamburgerClick}>
              <span
                className={`text-3xl ${
                  scrolled ? "text-gray-800" : "text-white"
                }`}
              >
                ☰
              </span>
            </button>
          </div>

          {/* Menu Links */}
          <div
            className={`fixed inset-y-0 right-0 w-64 bg-gray-800 p-8 transform transition-transform duration-300 md:relative md:flex md:w-auto md:bg-transparent md:p-0 ${
              isOpen ? "translate-x-0" : "translate-x-full"
            } md:translate-x-0 flex flex-col items-start gap-4 md:flex-row md:items-center`}
          >
            {isOpen && (
              <button
                onClick={handleCloseClick}
                className="absolute top-4 right-4 text-white md:hidden"
              >
                <FaTimes size={30} />
              </button>
            )}

            <Link
              href="/"
              onClick={() => setIsOpen(false)}
              className="text-white md:text-inherit"
            >
              Home
            </Link>
            <Link
              href="/destinations"
              onClick={() => setIsOpen(false)}
              className="text-white md:text-inherit"
            >
              Destinations
            </Link>
            <Link
              href="/about"
              onClick={() => setIsOpen(false)}
              className="text-white md:text-inherit"
            >
              About Us
            </Link>
            <Link
              href="/Knowledge"
              onClick={() => setIsOpen(false)}
              className="text-white md:text-inherit"
            >
              Knowledge
            </Link>

            {/* Auth Buttons */}
            {!isLoggedIn ? (
              <button
                onClick={() => {
                  setShowLogin(true);
                  setIsOpen(false);
                }}
                className="bg-blue-500 text-white px-4 py-2 rounded-full hover:bg-blue-600 transition-colors"
              >
                Log In
              </button>
            ) : (
              <button
                onClick={handleLogout}
                className="bg-red-500 text-white px-4 py-2 rounded-full hover:bg-red-600 transition-colors"
              >
                Log Out
              </button>
            )}
          </div>
        </nav>
      </div>

      {/* Login Form Modal */}
      {showLogin && (
        <LoginForm
          onClose={() => setShowLogin(false)}
          onLoginSuccess={() => {
            setIsLoggedIn(true);
            localStorage.setItem("isLoggedIn", "true");
            setShowLogin(false);
          }}
        />
      )}
    </>
  );
};

export default Navbar;
