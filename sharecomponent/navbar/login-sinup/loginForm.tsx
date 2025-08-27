"use client";
import { useState } from "react";
import style from "./loginForm.module.scss";

type LoginFormProps = {
  onClose: () => void;
  onSwitchToSignup?: () => void;
  onLoginSuccess?: () => void;
};

export default function LoginForm({
  onClose,
  onSwitchToSignup,
  onLoginSuccess,
}: LoginFormProps) {
  const [error, setError] = useState<string>("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(""); // reset error

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email");
    const password = formData.get("password");

    try {
      const res = await fetch("/api/users/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      console.log("Login Response:", data);

      if (res.ok) {
        localStorage.setItem("token", data.token); 
        onClose();
        onLoginSuccess?.();
      } else {
        setError(data.error || "Invalid credentials!");
      }
    } catch (err) {
      console.error(err);
      setError("Something went wrong. Try again.");
    }
  };

  return (
    <div className={style.overlay}>
      <div className={style.loginBox}>
        <button onClick={onClose} className={style.closeBtn}>
          ✖
        </button>

        <h2 className={style.title}>Welcome Back 👋</h2>
        <p className={style.subtitle}>Please log in to continue</p>

        <form className={style.form} onSubmit={handleSubmit}>
          <input
            type="email"
            name="email"
            placeholder="Email"
            required
            className={style.input}
          />
          <input
            type="password"
            name="password"
            placeholder="Password"
            required
            className={style.input}
          />
          {error && <p className={style.error}>{error}</p>}

          <button type="submit" className={style.loginBtn}>
            Login
          </button>
        </form>

    
      </div>
    </div>
  );
}
