import React from "react";
import { Link } from "react-router-dom";
import { FcGoogle } from "react-icons/fc";
import { useLogin } from "../hooks/useLogin";
import { useLoginRedirect } from "../hooks/useLoginRedirect";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  // Extract business logic into hooks
  const { user } = useAuth();
  const { loading, error, handleGoogleLogin } = useLogin();

  // Handle redirect after login
  useLoginRedirect(user);

  return (
    <div className="bg-[#fefefe] min-h-screen w-full overflow-hidden flex items-center justify-center px-2">
      {/* Logo */}
      <img
        src="/assets/image/LV Logo.png"
        alt="La Verdad Logo"
        className="
      fixed top-2 left-2 z-20 h-8 w-8
      sm:top-4 sm:left-4 sm:h-12 sm:w-12
      md:top-6 md:left-6 md:h-[70px] md:w-[70px]
      lg:h-[92px] lg:w-[92px]
      object-contain
    "
      />

      {/* Background */}
      <div className="fixed inset-0 z-0">
        <img
          src="/assets/image/LandingPage.png"
          alt="Background"
          className="w-full h-full object-cover opacity-80 pointer-events-none"
        />
      </div>

      {/* Centered Login Card - Fluid Sizing */}
      <div className="flex justify-center items-center min-h-screen w-full">
        <div
          className="
        bg-[#fefefe] rounded-[12px]
        shadow-black shadow-lg
        flex flex-col
        relative
        p-3 sm:p-6 md:p-8
      "
          style={{
            width: "clamp(280px, 80vw, 708px)",
            height: "clamp(340px, 52vw, 663px)",
            transition:
              "width 0.35s cubic-bezier(0.4,0,0.2,1), height 0.35s cubic-bezier(0.4,0,0.2,1)",
          }}
        >
          {/* Back Button */}
          <Link
            to="/"
            className="
          absolute left-3 top-3 text-sm
          flex items-center text-[#00396E]
          opacity-70 hover:opacity-100
          sm:left-6 sm:top-6 sm:text-base
          md:left-8 md:top-8 md:text-lg
          lg:left-12 lg:top-12
        "
          >
            <span className="transform rotate-180 mr-2">→</span>
            Back
          </Link>
          {/* Welcome Text */}
          <div className="flex-1 flex flex-col justify-center items-center mt-2 mb-2 sm:mt-5 sm:mb-2 md:mt-8 md:mb-2">
            <h2
              className="
      text-[1.45rem] sm:text-[1.65rem] md:text-[2rem] lg:text-[2.7rem]
      font-medium tracking-tight leading-tight text-[#003363] text-center
    "
            >
              Welcome <span className="text-[#e68b00]">back!</span>
            </h2>
            <p
              className="
      mt-2 sm:mt-2 md:mt-3
      text-sm sm:text-base md:text-[1.1rem] lg:text-[1.15rem]
      text-[rgba(0,57,110,0.75)] text-center
      font-medium
      max-w-[260px] sm:max-w-[350px] md:max-w-[440px] lg:max-w-none
    "
            >
              Reconnect and Get Started here at
              <span className="font-semibold text-[#00396e]"> La Verdad </span>
              <span className="font-semibold text-[#e68b00]">OrderFlow</span>
            </p>
          </div>

          {/* Login Button and Message */}
          <div className="w-full flex flex-col mt-6 sm:mt-8 md:mt-10">
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className={`
      w-full bg-[#0060BA] text-white rounded-[8px]
      py-3 sm:py-3.5 md:py-4
      flex items-center justify-center gap-3
      hover:bg-[#0055a8] transition-colors cursor-pointer
      font-semibold shadow
      ${loading ? "opacity-70 cursor-not-allowed" : ""}
    `}
            >
              <span className="bg-white rounded-2xl p-1.5">
                <FcGoogle className="text-lg sm:text-xl md:text-2xl" />
              </span>
              <span className="text-base sm:text-[1.1rem] md:text-[1.15rem]">
                {loading ? "Connecting..." : "Login with Google"}
              </span>
            </button>
            {error && (
              <p className="text-red-500 text-xs text-center mt-2 sm:text-sm">
                {error}
              </p>
            )}
            <p className="text-center mt-4 mb-0 sm:mt-6 sm:mb-3 md:mt-7 text-xs sm:text-base md:text-[1rem] text-[rgba(0,57,110,0.58)]">
              Sign in to your account to continue
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
