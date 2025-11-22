import React from "react";
import { useLoginForm } from "../../hooks/useLoginForm";
import { useRoleSelection } from "../../hooks/useRoleSelection";

export default function LoginForm() {
  // Extract business logic into hooks
  const { email, password, rememberMe, errors, handleChange, handleSubmit } =
    useLoginForm(async (formData) => {
      console.log("Form submitted:", formData);
      // TODO: Call login API
    });

  const { role, selectRole, getCurrentRoleInfo, getAvailableRoles } =
    useRoleSelection();

  const roleInfo = getCurrentRoleInfo();

  return (
    <div className="h-screen w-screen flex bg-white overflow-hidden">
      <div className="flex flex-col md:flex-row w-full h-full">
        {/* Left Side - Login Form */}
        <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center">
          {/* Back + Logo */}
          <div className="flex items-center mb-6">
            <button className="text-sm text-[#00396E] flex items-center gap-2 mb-12">
              ← Back
            </button>
          </div>

          <h2 className=" flex justify-center text-3xl font-bold text-gray-800 mb-2">
            Login
          </h2>
          <p className="text-gray-500 mb-6 flex justify-center">
            You are now logging-in as a{" "}
            <span className="text-orange-600 font-semibold pl-1">{role}</span>
          </p>

          {/* Role Switch */}
          <div className="inline-flex justify-center rounded-lg shadow-sm mb-6">
            {getAvailableRoles().map((availableRole) => (
              <button
                key={availableRole}
                className={`px-8 py-2 text-sm font-medium border ${
                  role === availableRole
                    ? "bg-blue-900 text-white border-blue-900 rounded-lg"
                    : "bg-white text-orange-500 border-gray-200 hover:bg-gray-50"
                }`}
                onClick={() => selectRole(availableRole)}
              >
                {availableRole}
              </button>
            ))}
          </div>

          {/* Info Box */}
          <div className="flex justify-center p-4 mb-6 bg-gray-50 rounded-lg border border-gray-100 shadow-sm">
            <div className="p-2 bg-white rounded-lg mr-3">
              <svg
                className="w-6 h-6 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-gray-700">
                {getCurrentRoleInfo().portal}
              </p>
              <p className="text-sm text-gray-500">
                {getCurrentRoleInfo().description}
              </p>
            </div>
          </div>

          {/* Email Input */}
          <div className="mb-6 px-16">
            <label className="block text-sm font-medium text-[#003363] mb-1">
              E-mail
            </label>
            <input
              type="email"
              name="email"
              value={email}
              onChange={handleChange}
              placeholder="Enter your e-mail"
              className="w-full py-2 border-b border-blue-500 focus:outline-none focus:border-blue-500"
            />
            {errors.email && (
              <p className="text-red-500 text-xs mt-1">{errors.email}</p>
            )}
          </div>

          {/* Password Input */}
          <div className="mb-6 px-16">
            <label className="block text-sm font-medium text-[#003363] mb-1">
              Password
            </label>
            <input
              type="password"
              name="password"
              value={password}
              onChange={handleChange}
              placeholder="Enter your password"
              className="w-full py-2 border-b border-blue-500 focus:outline-none focus:border-blue-500"
            />
            {errors.password && (
              <p className="text-red-500 text-xs mt-1">{errors.password}</p>
            )}
          </div>

          {/* Remember Me & Forgot Password */}
          <div className="flex justify-between items-center mb-6">
            <label className="flex items-center text-sm text-gray-600 px-16">
              <input
                type="checkbox"
                name="rememberMe"
                checked={rememberMe}
                onChange={handleChange}
                className="mr-2"
              />
              Remember me
            </label>
            <a href="#" className="text-sm text-[#00396E] mr-16 ">
              Forgot your password
            </a>
          </div>

          {/* Login Button */}
          <div className="flex justify-center">
            <button
              onClick={handleSubmit}
              className="w-[70%] bg-[#003363] text-white py-2 rounded-lg font-semibold shadow-md hover:bg-blue-800"
            >
              Login
            </button>
          </div>

          {/* Register Link */}
          <p className="text-sm text-center mt-6 text-gray-600">
            Don’t have an account?{" "}
            <a href="#" className="text-orange-500 font-semibold">
              Register here
            </a>
          </p>
        </div>

        {/* Right Side - Welcome Text and Image */}
        <div className="hidden md:flex md:w-1/2 bg-gray-50 rounded-[50px] relative flex-col shadow-gray-600 shadow-md">
          {/* Logo */}
          <img
            src="/assets/image/LV Logo.png"
            alt="Logo"
            className="absolute top-6 left-6 h-14"
          />

          {/* Centered Text */}
          <div className="text-center mt-40">
            <h2 className="text-4xl font-bold mb-2 flex justify-center text-[#003363]">
              Welcome <span className="text-orange-500 pl-1"> back</span>
            </h2>
            <p className="text-[##00396E] opacity-50">
              Sign in to your account to continue
            </p>
          </div>

          {/* Full Height Image at Bottom */}
          <div className="flex justify-center items-end h-[100%]">
            <img
              src="/assets/image/login.png"
              alt="Background"
              className="w-full  object-cover rounded-xl shadow-2xl"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
