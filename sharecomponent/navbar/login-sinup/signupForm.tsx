"use client";
import { useState } from "react";
import style from "./loginForm.module.scss";

type SignupFormProps = {
  onClose: () => void;
  onSwitchToLogin?: () => void;
};

export default function SignupForm({ onClose, onSwitchToLogin }: SignupFormProps) {
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

  
    let newErrors: { [key: string]: string } = {};
    if (!name.trim()) newErrors.name = "Full name is required";
    if (!email.trim()) newErrors.email = "Email is required";
    if (!password.trim()) newErrors.password = "Password is required";
    if (password.length < 6) newErrors.password = "Password must be at least 6 characters";
    if (password !== confirmPassword) newErrors.confirmPassword = "Passwords do not match";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/users/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (res.ok) {
        localStorage.setItem("token", data.token);
        // alert("Signup successful!");
        onClose();
        onSwitchToLogin?.();
      } else {
        setErrors({ email: data.error || "Signup failed" });
      }
    } catch (err) {
      console.error(err);
      setErrors({ general: "Something went wrong. Try again." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={style.overlay}>
      <div className={style.loginBox}>
        <button onClick={onClose} className={style.closeBtn}>✖</button>

        <h2 className={style.title}>Create an Account ✨</h2>
        <p className={style.subtitle}>Please sign up to get started</p>

        <form className={style.form} onSubmit={handleSubmit}>
          <input type="text" name="name" placeholder="Full Name" className={style.input} />
          {errors.name && <p className={style.error}>{errors.name}</p>}

          <input type="email" name="email" placeholder="Email" className={style.input} />
          {errors.email && <p className={style.error}>{errors.email}</p>}

          <input type="password" name="password" placeholder="Password" className={style.input} />
          {errors.password && <p className={style.error}>{errors.password}</p>}

          <input type="password" name="confirmPassword" placeholder="Confirm Password" className={style.input} />
          {errors.confirmPassword && <p className={style.error}>{errors.confirmPassword}</p>}

          {errors.general && <p className={style.error}>{errors.general}</p>}

          <button type="submit" className={style.loginBtn} disabled={loading}>
            {loading ? "Signing Up..." : "Sign Up"}
          </button>
        </form>

        <p className={style.registerText}>
          Already have an account?{" "}
          <a href="#" onClick={(e) => { e.preventDefault(); onSwitchToLogin?.(); }}>
            Login
          </a>
        </p>
      </div>
    </div>
  );
}
