"use client";
import React, { useState, useEffect } from "react";
import { FaTimes } from "react-icons/fa";
import style from "./navbar.module.scss";
import LoginForm from "./login-sinup/loginForm";
import Link from "next/link";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [loading, setLoading] = useState(true);

  // check login status on load
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
      <div className={`${style.main} ${scrolled ? style.scrolled : ""}`}>
        <nav className={style.navbar}>

           <h1><strong>Dashboard</strong></h1>

          <div className={`${style.navbarLinks} ${isOpen ? style.active : ""}`}>
            {isOpen && (
              <div className={style.closeIcon} onClick={handleCloseClick}>
                <FaTimes color="white" size={30} />
              </div>
            )}

            <Link href="/">Home</Link>
            <Link href="/destinations">Destinations</Link>
            <Link href="/about">About Us</Link>
            <Link href="/knowledge">Knowledge</Link>

            {!isLoggedIn ? (
              <button
                onClick={() => setShowLogin(true)}
                className={style.loginBtn}
              >
                Log In
              </button>
            ) : (
              <button onClick={handleLogout} className={style.loginBtn}>
                Log Out
              </button>
            )}
          </div>

          <div className={style.hamburger} onClick={handleHamburgerClick}>
            ☰
          </div>
        </nav>
      </div>

      {showLogin && (
        <LoginForm
          onClose={() => setShowLogin(false)}
          onSwitchToSignup={() => {
            setShowLogin(false);
            setShowSignup(true);
          }}
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
