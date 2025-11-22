import React from "react";
import { Link } from "react-router-dom";
import { useScrollOnState } from "../hooks/useScrollOnState";
import Header from "../components/common/Header";
import Footer from "../components/common/Footer";
import ContactForm from "../components/common/ContactForm";
import FeatureCarousel from "../constants/carouselSlides";

export default function LandingPage() {
  useScrollOnState();
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <Header />

      {/* Hero Section - Add padding-top to account for fixed header */}
      <section className="relative w-full px-4 sm:px-6 lg:px-8 bg-white pt-20 sm:pt-24">
        {/* Background Image with Text Behind */}
        <FeatureCarousel />

        {/* Content under the Background */}
        <div className="container mx-auto px-4 sm:px-6 py-8 sm:py-12 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          <div className="max-w-xl space-y-4 sm:space-y-6">
            <p className="text-sm sm:text-base lg:text-lg text-[#003363] leading-relaxed">
              A Web-Based Order Tracking System with QR-integrated Inventory
              Monitoring of school uniforms at La Verdad Christian College Inc.,
              Apalit.
            </p>
            <Link
              to="/get-started"
              className="border-2 border-[#E68B00] text-[#E68B00] px-6 sm:px-8 py-2.5 sm:py-3 rounded-full font-semibold hover:bg-orange-50 hover:text-orange-600 transition ml-auto block w-fit text-sm sm:text-base min-h-[44px] flex items-center justify-center"
            >
              Get Started
            </Link>
          </div>

          {/* Right Content (Social Media Preview) */}
          <div className="bg-white p-4 sm:p-6 rounded-xl shadow-lg relative flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-0">
            <img
              src="../../assets/image/page.png"
              alt="La Verdad Christian College Facebook"
              className="w-full sm:w-[200px] md:w-[280px] lg:w-[320px] h-auto rounded-lg shadow-md flex-shrink-0"
            />
            <div className="sm:ml-4 md:ml-6 lg:ml-8 text-center sm:text-left w-full sm:w-auto">
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-[#163869] leading-tight">
                Follow us on our <br className="hidden sm:block" />
                <span className="text-[#E68B00]">Social Media</span>
              </h2>
              <p className="mt-2 text-base sm:text-lg text-[#235292] font-semibold">
                La Verdad Christian College
              </p>
              <p className="text-sm sm:text-base text-orange-600">
                Apalit, Pampanga
              </p>
            </div>
            <a
              href="https://www.facebook.com/lvcc.apalit"
              target="_blank"
              rel="noopener noreferrer"
              className="absolute bottom-4 right-4 min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              <button className="bg-yellow-400 rounded-lg p-3 shadow flex items-center hover:bg-yellow-500 transition">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M14 5l7 7m0 0l-7 7m7-7H3"
                  />
                </svg>
              </button>
            </a>
            <div className="absolute left-0 bottom-0 w-full h-3 bg-[#163869] rounded-b-xl" />
          </div>
        </div>
      </section>

      {/* Featured Section */}
      <section id="featured" className="bg-gray-50 py-8 sm:py-12 lg:py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#003363] mb-8 sm:mb-12">
            Now <span className="text-[#E68B00]">Available</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {/* Card 1 */}
            <div className="bg-white p-4 sm:p-6 rounded-xl shadow-md hover:shadow-lg transition">
              <h3 className="text-lg sm:text-xl lg:text-2xl font-semibold text-[#003363] mb-1">
                Senior High Uniforms
              </h3>
              <p className="text-sm sm:text-base text-gray-600 mb-4">
                are now Available!
              </p>
              <img
                src="../../assets/image/card1.png"
                alt="Senior High Uniforms"
                className="w-full h-40 sm:h-48 lg:h-56 object-cover rounded-lg mb-4"
              />
              <div>
                <Link
                  to="/order"
                  className="text-orange-500 font-semibold text-sm sm:text-base hover:underline min-h-[44px] flex items-center"
                >
                  Click here to Order →
                </Link>
              </div>
            </div>

            {/* Card 2 */}
            <div className="bg-white p-4 sm:p-6 rounded-xl shadow-md hover:shadow-lg transition">
              <h3 className="text-lg sm:text-xl lg:text-2xl font-semibold text-[#003363] mb-1">
                Basic Education Uniforms
              </h3>
              <p className="text-sm sm:text-base text-gray-600 mb-4">
                are now Available!
              </p>
              <img
                src="../../assets/image/card2.png"
                alt="Basic Education Uniforms"
                className="w-full h-40 sm:h-48 lg:h-56 object-cover rounded-lg mb-4"
              />
              <Link
                to="/order"
                className="text-orange-500 font-semibold text-sm sm:text-base hover:underline min-h-[44px] flex items-center"
              >
                Click here to Order →
              </Link>
            </div>

            {/* Card 3 */}
            <div className="bg-white p-4 sm:p-6 rounded-xl shadow-md hover:shadow-lg transition sm:col-span-2 lg:col-span-1">
              <h3 className="text-lg sm:text-xl lg:text-2xl font-semibold text-[#003363] mb-1">
                Notebooks
              </h3>
              <p className="text-sm sm:text-base text-gray-600 mb-4">
                are now Available!
              </p>
              <img
                src="../../assets/image/card3.png"
                alt="Notebooks"
                className="w-full h-40 sm:h-48 lg:h-56 object-cover rounded-lg mb-4"
              />
              <Link
                to="/order"
                className="text-orange-500 font-semibold text-sm sm:text-base hover:underline min-h-[44px] flex items-center"
              >
                Click here to Order →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* About Section - Vision & Mission - FIXED: Proper spacing and image containment */}
      <section className="relative w-full py-8 sm:py-12 lg:py-16 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
          {/* Vision & Mission Grid - Text on Top */}
          <div
            id="about"
            className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 lg:gap-16 mb-8 sm:mb-12 lg:mb-16"
          >
            {/* Vision */}
            <div id="vision" className="text-center">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#163869] mb-3 sm:mb-4">
                Vision
              </h2>
              {/* Orange underline */}
              <div className="w-16 sm:w-20 h-1 bg-[#E68B00] mx-auto mb-4 sm:mb-6"></div>
              <p className="text-sm sm:text-base lg:text-lg text-[#003363] font-SFPro leading-relaxed max-w-md mx-auto">
                The institution that ensures
                <span className="text-[#E68B00] font-semibold">
                  {" "}
                  quality learning{" "}
                </span>
                and{" "}
                <span className="text-[#E68B00] font-semibold">
                  biblical moral standards.
                </span>
              </p>
            </div>

            {/* Mission */}
            <div id="mission" className="text-center">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#163869] mb-3 sm:mb-4">
                Mission
              </h2>
              {/* Orange underline */}
              <div className="w-16 sm:w-20 h-1 bg-[#E68B00] mx-auto mb-4 sm:mb-6"></div>
              <p className="text-sm sm:text-base lg:text-lg text-[#003363] font-SFPro leading-relaxed max-w-md mx-auto">
                To be the frontrunner in providing
                <span className="text-[#E68B00] font-semibold">
                  {" "}
                  academic excellence{" "}
                </span>
                and
                <span className="text-[#E68B00] font-semibold">
                  {" "}
                  morally upright principles.
                </span>
              </p>
            </div>
          </div>

          {/* Background Image - FIXED: Contained with proper spacing */}
          <div className="relative w-full">
            <div className="relative w-full max-w-6xl mx-auto px-4 sm:px-8 lg:px-12">
              <img
                src="../../assets/image/Untitled design.png"
                alt="La Verdad Christian College Building"
                className="w-full h-auto object-contain rounded-lg shadow-md"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <div
        id="contact"
        className="w-full min-h-screen flex flex-col items-center justify-center bg-[#fefefe] py-8 sm:py-12 lg:py-16"
      >
        <div className="w-full max-w-6xl flex flex-col lg:flex-row justify-center items-start gap-8 lg:gap-16 px-4 sm:px-6 lg:px-8">
          {/* LEFT: Contact Form with Image */}
          <div className="w-full lg:w-1/2">
            <ContactForm />
          </div>

          {/* RIGHT: Contact Info */}
          <div className="w-full lg:w-1/2 flex flex-col justify-start items-start">
            <h3 className="text-lg sm:text-xl font-semibold text-[#163869] mb-2">
              Contact <span className="text-[#E68B00]">Us</span>
            </h3>
            <div className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold text-[#163869] mb-4 leading-tight">
              We are here to <br />
              <span className="text-[#E68B00]">assist</span> you
            </div>
            <p className="text-[#163869] text-sm sm:text-base mb-6 lg:mb-8 max-w-xl leading-relaxed">
              If you have any inquiries, require assistance, or wish to provide
              feedback, we are here to assist you.
            </p>

            {/* Contact Information */}
            <div className="w-full space-y-4 sm:space-y-6">
              <h4 className="text-base sm:text-lg lg:text-xl font-bold text-[#163869]">
                Contact <span className="text-[#E68B00]">information</span>
              </h4>

              {/* Address */}
              <div className="flex items-start gap-3 min-h-[44px]">
                <span className="text-[#163869] text-lg sm:text-xl flex-shrink-0">
                  📍
                </span>
                <div>
                  <span className="font-bold text-[#163869] block text-sm sm:text-base">
                    Address
                  </span>
                  <span className="text-[#163869] text-sm sm:text-base leading-relaxed">
                    Mac Arthur High-way, Sampaloc, Apalit,
                    <br />
                    Pampanga
                  </span>
                </div>
              </div>

              {/* Contact Details */}
              <div className="flex items-start gap-3 min-h-[44px]">
                <span className="text-[#163869] text-lg sm:text-xl flex-shrink-0">
                  ✉
                </span>
                <div>
                  <span className="font-bold text-[#163869] block text-sm sm:text-base">
                    Contact
                  </span>
                  <span className="text-[#163869] text-sm sm:text-base leading-relaxed">
                    +639479998499
                    <br />
                    support@laverdad.edu.ph
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM SECTION: Google Maps */}
        <div className="w-full flex flex-col items-center mt-12 sm:mt-16 lg:mt-24 px-4 sm:px-6 lg:px-8">
          <div className="text-lg sm:text-xl lg:text-2xl text-center font-bold text-[#163869] mb-3">
            Find Us on <span className="text-[#E68B00]">Google Maps</span>
          </div>
          <p className="mt-2 sm:mt-3 text-[#163869] text-sm sm:text-base text-center max-w-xl mb-6 sm:mb-8 leading-relaxed px-4">
            If you have any inquiries, require assistance, or wish to provide
            feedback, we are here to assist you
          </p>
          <div className="w-full max-w-7xl">
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d123347.40710675181!2d120.61418624335936!3d14.959002300000003!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x33965634a341dc6f%3A0x17091aa8b0043f89!2sLa%20Verdad%20Christian%20College!5e0!3m2!1sen!2sph!4v1737910779201!5m2!1sen!2sph"
              className="w-full h-[300px] sm:h-[400px] md:h-[500px] lg:h-[600px] rounded-lg shadow-lg"
              allowFullScreen=""
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Google Map"
            ></iframe>
          </div>
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}
