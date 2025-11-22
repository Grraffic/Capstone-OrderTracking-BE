import { CiFacebook } from "react-icons/ci";
import { TfiEmail } from "react-icons/tfi";
import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="bg-Footer">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 md:py-10 lg:py-12">
        {/* Main Footer Content */}
        <div className="flex flex-col lg:flex-row lg:justify-between gap-6 sm:gap-8 lg:gap-12">
          {/* Logo and Description */}
          <div className="flex flex-col items-center lg:items-start max-w-full lg:max-w-xl">
            <Link
              to="/home/announcement"
              className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 md:gap-4 mb-3 sm:mb-4 min-h-[44px]"
            >
              <img
                src="../../../assets/image/LV Logo.png"
                alt="LV Logo"
                className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 hover:scale-105 transition-transform cursor-pointer"
              />
              <p className="text-center sm:text-left text-[#161F55] font-Tolkien text-lg sm:text-xl md:text-2xl lg:text-[28px] leading-tight">
                LA VERDAD CHRISTIAN COLLEGE
              </p>
            </Link>
            <p className="text-xs sm:text-sm md:text-[14px] text-center lg:text-left font-LatoRegular text-LBackground max-w-full sm:max-w-[400px] lg:max-w-[510px] px-4 sm:px-0 lg:ml-24 leading-relaxed">
              Seamless appointment management—stay organized, save time, and
              never miss an appointment with ease and efficiency.
            </p>
          </div>

          {/* Follow Us and Contact Us Container */}
          <div className="flex flex-col sm:flex-row justify-center items-center sm:items-start gap-6 sm:gap-8 md:gap-12 lg:gap-16">
            {/* Follow Us Section */}
            <div className="flex flex-col items-center space-y-2 sm:space-y-3">
              <p className="font-LatoRegular text-lg sm:text-xl md:text-2xl text-LBackground font-semibold">
                FOLLOW US
              </p>
              <div className="flex justify-center items-center space-x-3 sm:space-x-4">
                <a
                  href="https://www.facebook.com/lvcc.apalit"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Visit our Facebook page"
                  className="hover:scale-110 transition-transform min-w-[44px] min-h-[44px] flex items-center justify-center"
                >
                  <CiFacebook className="text-Primary w-9 h-9 sm:w-10 sm:h-10 md:w-11 md:h-11 hover:text-PrimaryDark transition-colors" />
                </a>
                <a
                  href="mailto:support@laverdad.edu.ph"
                  aria-label="Send us an email"
                  className="hover:scale-110 transition-transform min-w-[44px] min-h-[44px] flex items-center justify-center"
                >
                  <TfiEmail className="text-Primary w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 hover:text-PrimaryDark transition-colors" />
                </a>
              </div>
            </div>

            {/* Contact Us Section */}
            <div className="flex flex-col items-center space-y-2 sm:space-y-3">
              <p className="font-LatoRegular text-lg sm:text-xl md:text-2xl text-LBackground font-semibold">
                CONTACT US
              </p>
              <div className="text-center">
                <p className="text-xs sm:text-sm md:text-[14px] font-LatoRegular text-LBackground leading-relaxed">
                  support@laverdad.edu.ph
                </p>
                <p className="text-xs sm:text-sm md:text-[14px] font-LatoRegular text-LBackground leading-relaxed">
                  +639479998499
                </p>
                <p className="text-xs sm:text-sm md:text-[14px] font-LatoRegular text-LBackground max-w-[180px] sm:max-w-[200px] md:max-w-[220px] leading-relaxed">
                  Mac Arthur High-way, Sampaloc, Apalit, Pampanga
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="border-b-2 border-Primary opacity-50 w-[85%] sm:w-[90%] mx-auto"></div>

      {/* Copyright */}
      <p className="text-center text-xs sm:text-sm md:text-base py-3 sm:py-4 md:py-6 lg:py-8 px-4 leading-relaxed">
        © 2024 . La Verdad Christian College, Inc.
      </p>
    </footer>
  );
};

export default Footer;
