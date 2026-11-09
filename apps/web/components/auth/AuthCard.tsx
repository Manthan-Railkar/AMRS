"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import gsap from "gsap";
import { useQueryClient } from "@tanstack/react-query";
import {
  signUpAction,
  signInAction,
  getGoogleOAuthUrlAction,
} from "@/app/actions/auth";

interface AuthCardProps {
  initialMode?: "signup" | "login";
  onClose?: () => void;
  isModal?: boolean;
}

export default function AuthCard({ initialMode = "signup", onClose, isModal = false }: AuthCardProps) {
  const root = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const queryClient = useQueryClient();

  const [mode, setMode] = useState<"signup" | "login">(initialMode);
  const [showPassword, setShowPassword] = useState(false);
  const [agree, setAgree] = useState(true);
  const [rememberMe, setRememberMe] = useState(true);

  // Form states
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Loading & feedback states
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Entrance orchestration
  useEffect(() => {
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      tl.from(root.current, { y: 20, opacity: 0.4, scale: 0.99, duration: 0.7 }).from(
        ".reveal",
        { y: 14, opacity: 0.3, duration: 0.5, stagger: 0.04 },
        "-=0.3"
      );
    });
    return () => mm.revert();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (mode === "signup" && !agree) {
      setErrorMsg("Please agree to the Terms & Conditions to create an account.");
      return;
    }

    setLoading(true);

    try {
      if (mode === "signup") {
        const res = await signUpAction({
          firstName,
          lastName,
          email,
          password,
        });

        if (!res.success) {
          setErrorMsg(res.error || "Failed to create account.");
        } else {
          if (res.user?.id) {
            localStorage.setItem("amrs_active_user_id", res.user.id);
            localStorage.setItem("amrs_active_user_email", res.user.email);
            document.cookie = `amrs_user_id=${res.user.id}; path=/; max-age=2592000; SameSite=Lax`;
          }
          setSuccessMsg("Account created and saved to database! Redirecting to dashboard...");
          queryClient.clear();
          await queryClient.invalidateQueries();
          setTimeout(() => {
            router.push("/dashboard");
            router.refresh();
          }, 600);
        }
      } else {
        const res = await signInAction({
          email,
          password,
        });

        if (!res.success) {
          setErrorMsg(res.error || "Failed to log in.");
        } else {
          if (res.user?.id) {
            localStorage.setItem("amrs_active_user_id", res.user.id);
            localStorage.setItem("amrs_active_user_email", res.user.email);
            document.cookie = `amrs_user_id=${res.user.id}; path=/; max-age=2592000; SameSite=Lax`;
          }
          setSuccessMsg("Logged in successfully! Redirecting to dashboard...");
          queryClient.clear();
          await queryClient.invalidateQueries();
          setTimeout(() => {
            router.push("/dashboard");
            router.refresh();
          }, 600);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An unexpected error occurred.";
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const res = await getGoogleOAuthUrlAction(`${origin}/auth/callback`);

      if (res.error) {
        setErrorMsg(res.error);
        setLoading(false);
      } else if (res.url) {
        window.location.href = res.url;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to initiate Google sign in.";
      setErrorMsg(msg);
      setLoading(false);
    }
  };

  const getFieldStyle = (fieldName: string) => ({
    backgroundColor: focusedField === fieldName ? "#322c40" : "#3c364c",
    borderColor: focusedField === fieldName ? "#7260b2" : "transparent",
    outline: "none",
    boxShadow: focusedField === fieldName ? "0 0 0 1px #7260b2" : "none",
  });

  return (
    <div
      ref={root}
      className="relative flex w-full max-w-[1250px] flex-col gap-6 rounded-[24px] sm:rounded-[28px] bg-[#2c2638] p-4 sm:p-5 shadow-[0_35px_90px_-15px_rgba(18,10,36,0.6),0_0_0_1px_rgba(255,255,255,0.06)] lg:h-[780px] lg:flex-row lg:gap-0"
    >
      {/* Modal close button */}
      {isModal && onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Close dialog"
          className="absolute right-4 top-4 z-30 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white/70 hover:bg-white/20 hover:text-white transition-colors cursor-pointer"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}

      {/* Left panel: Promo Video with AMRS brand logo and navigation */}
      <section className="relative h-[360px] w-full shrink-0 overflow-hidden rounded-[20px] bg-[#0c0818] lg:h-full lg:w-[49%]">
        <video
          src="/assets/promo.mp4"
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 h-full w-full object-cover"
        />
        {/* Subtle gradient vignette to maintain contrast for top brand logo and navigation */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/30 pointer-events-none z-10" />

        {/* Top-Left: AMRS Brand Logo */}
        <div className="absolute left-[28px] sm:left-[32px] top-[26px] sm:top-[30px] z-20 flex items-center">
          <Image
            src="/assets/img/amrs-logo.png"
            alt="AMRS"
            width={112}
            height={38}
            priority
            className="h-[26px] sm:h-[30px] w-auto object-contain filter drop-shadow-[0_2px_8px_rgba(0,0,0,0.65)]"
          />
        </div>

        {/* Top-Right: Back to website pill */}
        <Link
          href="/"
          className="absolute right-[16px] sm:right-[26px] top-[18px] sm:top-[26px] z-20 flex h-[32px] sm:h-[34px] items-center gap-1.5 sm:gap-2 rounded-full bg-white/[0.14] px-3 sm:px-[16px] text-[12px] sm:text-[14px] font-medium text-white backdrop-blur-md border border-white/10 transition-colors hover:bg-white/25 shadow-sm"
        >
          <span>Back to website</span>
          <svg
            width="13"
            height="13"
            viewBox="0 0 14 14"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M2 7h10M8 3l4 4-4 4" />
          </svg>
        </Link>
      </section>

      {/* Right panel: Authentication form */}
      <section className="flex flex-1 flex-col justify-center px-4 pb-8 pt-2 sm:px-10 lg:pl-[64px] lg:pr-[72px] lg:pb-0 lg:pt-0">
        <div className="mx-auto w-full max-w-[454px] lg:mx-0">
          <AnimatePresence mode="wait">
            {mode === "signup" ? (
              <motion.div
                key="signup-header"
                initial={{ opacity: 0.5, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
              >
                <h1 className="reveal text-[36px] sm:text-[44px] font-normal leading-tight tracking-[-0.025em] text-white">
                  Create an account
                </h1>
                <p className="reveal mt-2 sm:mt-3 text-[16px] leading-6 text-white/75">
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setMode("login");
                      setErrorMsg(null);
                      setSuccessMsg(null);
                    }}
                    className="text-[#b9a7f7] underline underline-offset-2 hover:text-white transition-colors cursor-pointer font-medium"
                  >
                    Log in
                  </button>
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="login-header"
                initial={{ opacity: 0.5, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
              >
                <h1 className="reveal text-[36px] sm:text-[44px] font-normal leading-tight tracking-[-0.025em] text-white">
                  Log in to AMRS
                </h1>
                <p className="reveal mt-2 sm:mt-3 text-[16px] leading-6 text-white/75">
                  Don&apos;t have an account?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setMode("signup");
                      setErrorMsg(null);
                      setSuccessMsg(null);
                    }}
                    className="text-[#b9a7f7] underline underline-offset-2 hover:text-white transition-colors cursor-pointer font-medium"
                  >
                    Sign up
                  </button>
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Feedback messages */}
          {errorMsg && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 rounded-md border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-[13px] text-red-200"
            >
              {errorMsg}
            </motion.div>
          )}

          {successMsg && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2.5 text-[13px] text-emerald-200"
            >
              {successMsg}
            </motion.div>
          )}

          <form className="mt-[28px] sm:mt-[36px] flex flex-col gap-4 sm:gap-[18px]" onSubmit={handleSubmit}>
            {mode === "signup" && (
              <div className="reveal grid grid-cols-2 gap-3.5 sm:gap-4">
                <input
                  style={getFieldStyle("firstName")}
                  onFocus={() => setFocusedField("firstName")}
                  onBlur={() => setFocusedField(null)}
                  className="h-[50px] sm:h-[52px] w-full rounded-[6px] border px-[18px] text-[16px] text-white placeholder-[#7d768d] transition-colors"
                  placeholder="First name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  disabled={loading}
                  aria-label="First name"
                  required
                />
                <input
                  style={getFieldStyle("lastName")}
                  onFocus={() => setFocusedField("lastName")}
                  onBlur={() => setFocusedField(null)}
                  className="h-[50px] sm:h-[52px] w-full rounded-[6px] border px-[18px] text-[16px] text-white placeholder-[#7d768d] transition-colors"
                  placeholder="Last name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  disabled={loading}
                  aria-label="Last name"
                  required
                />
              </div>
            )}

            <input
              style={getFieldStyle("email")}
              onFocus={() => setFocusedField("email")}
              onBlur={() => setFocusedField(null)}
              className="reveal h-[50px] sm:h-[52px] w-full rounded-[6px] border px-[18px] text-[16px] text-white placeholder-[#7d768d] transition-colors"
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              aria-label="Email"
              required
            />

            <div className="reveal relative">
              <input
                style={getFieldStyle("password")}
                onFocus={() => setFocusedField("password")}
                onBlur={() => setFocusedField(null)}
                className="h-[50px] sm:h-[52px] w-full rounded-[6px] border px-[18px] pr-12 text-[16px] text-white placeholder-[#7d768d] transition-colors"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                aria-label="Password"
                minLength={6}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-[16px] top-1/2 -translate-y-1/2 text-[#8d86a0] transition-colors hover:text-white cursor-pointer"
              >
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M2 12s3.8-6.5 10-6.5S22 12 22 12s-3.8 6.5-10 6.5S2 12 2 12z" />
                  <circle cx="12" cy="12" r="3" />
                  {showPassword && <line x1="3" y1="3" x2="21" y2="21" />}
                </svg>
              </button>
            </div>

            {mode === "signup" ? (
              <label className="reveal mt-0.5 flex cursor-pointer items-center gap-3 text-[14px] text-white select-none">
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={agree}
                  onChange={(e) => setAgree(e.target.checked)}
                  disabled={loading}
                />
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-[4px] bg-white transition-opacity">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <motion.path
                      d="M2.5 8.5l3.5 3.5 7.5-8"
                      stroke="#1c1429"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      initial={false}
                      animate={{ pathLength: agree ? 1 : 0, opacity: agree ? 1 : 0 }}
                      transition={{ duration: 0.2 }}
                    />
                  </svg>
                </span>
                <span className="text-white/90">
                  I agree to the{" "}
                  <a href="#terms" className="text-[#b9a7f7] underline underline-offset-2 hover:text-white">
                    Terms &amp; Conditions
                  </a>
                </span>
              </label>
            ) : (
              <div className="reveal mt-0.5 flex items-center justify-between text-[14px]">
                <label className="flex cursor-pointer items-center gap-3 text-white/90 select-none">
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    disabled={loading}
                  />
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-[4px] bg-white transition-opacity">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                      <motion.path
                        d="M2.5 8.5l3.5 3.5 7.5-8"
                        stroke="#1c1429"
                        strokeWidth="2.4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        initial={false}
                        animate={{ pathLength: rememberMe ? 1 : 0, opacity: rememberMe ? 1 : 0 }}
                        transition={{ duration: 0.2 }}
                      />
                    </svg>
                  </span>
                  <span>Remember me</span>
                </label>
                <a href="#forgot" className="text-[#b9a7f7] hover:underline hover:text-white transition-colors">
                  Forgot password?
                </a>
              </div>
            )}

            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: loading ? 1 : 1.005 }}
              whileTap={{ scale: loading ? 1 : 0.985 }}
              style={{ backgroundColor: "#6d54b5" }}
              className="reveal mt-3 sm:mt-4 h-[50px] sm:h-[52px] w-full rounded-[6px] text-[16px] font-medium text-white transition-colors cursor-pointer hover:bg-[#7b61c6] shadow-[0_4px_16px_rgba(109,84,181,0.35)] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading && (
                <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              )}
              <span>
                {loading
                  ? mode === "signup"
                    ? "Creating account..."
                    : "Logging in..."
                  : mode === "signup"
                  ? "Create account"
                  : "Log in"}
              </span>
            </motion.button>

            <div className="reveal my-0.5 flex items-center gap-4 text-[13px] sm:text-[14px] text-[#7d768d]">
              <span className="h-px flex-1 bg-[#534b66]/60" />
              <span>{mode === "signup" ? "Or register with" : "Or log in with"}</span>
              <span className="h-px flex-1 bg-[#534b66]/60" />
            </div>

            {/* Continue with Google */}
            <motion.button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              whileHover={{ backgroundColor: "rgba(255,255,255,0.06)", borderColor: "#7a7094" }}
              whileTap={{ scale: 0.985 }}
              className="reveal flex h-[50px] sm:h-[52px] w-full items-center justify-center gap-3 rounded-[6px] border border-[#5a526f] text-[15px] sm:text-[16px] font-medium text-white transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <GoogleIcon />
              <span>Continue with Google</span>
            </motion.button>
          </form>
        </div>
      </section>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.57-5.17 3.57-8.82z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.95-2.91l-3.88-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.27v3.09A12 12 0 0 0 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.28A7.2 7.2 0 0 1 4.9 12c0-.79.14-1.56.37-2.28V6.63H1.27a12 12 0 0 0 0 10.74l4-3.09z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.27 6.63l4 3.09C6.22 6.86 8.87 4.75 12 4.75z"
      />
    </svg>
  );
}
