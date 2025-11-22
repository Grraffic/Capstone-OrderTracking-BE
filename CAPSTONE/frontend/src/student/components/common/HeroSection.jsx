import React from "react";

const HeroSection = () => {
  return (
    <div className="pointer-events-none">
      {/* Fixed Background Image - Fills entire area including behind navbar */}
      <div
        className="fixed top-0 left-0 right-0 -z-10"
        style={{
          height: "calc(16rem + 4rem)", // Hero height + navbar height
        }}
      >
        <img
          src="/assets/image/LandingPage.png"
          alt="La Verdad Campus"
          className="w-full h-full object-cover"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            width: "100%",
            height: "calc(16rem + 4rem)",
            objectFit: "cover",
          }}
          onError={(e) => {
            // Fallback gradient if image fails to load
            e.target.style.display = "none";
            e.target.parentElement.style.background =
              "linear-gradient(135deg, #003363 0%, #0C2340 100%)";
          }}
        />
        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#003363]/40 to-transparent"></div>
      </div>

      {/* Fixed Content - Order Yours text stays in place */}
      <div
        className="fixed px-4 sm:px-8 md:px-16"
        style={{
          top: "calc(4rem + 2rem)", // Navbar height + padding
          zIndex: -5, // Behind content but above background
        }}
      >
        <div className="text-left">
          <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold text-white drop-shadow-2xl leading-tight">
            Order
            <br />
            Yours
          </h1>
        </div>
      </div>
    </div>
  );
};

export default HeroSection;
