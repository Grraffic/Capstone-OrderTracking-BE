import { useState, useRef, useEffect } from "react";
import { User, Menu } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useNavigateToSection } from "../../hooks/useNavigateToSection";

export default function Header() {
  const navigateToSection = useNavigateToSection();
  const [activeTab, setActiveTab] = useState("featured");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const desktopTextRef = useRef(null);
  const mobileTextRef = useRef(null);
  const [desktopUnderlineWidth, setDesktopUnderlineWidth] = useState(0);
  const [mobileUnderlineWidth, setMobileUnderlineWidth] = useState(0);

  // Update underline widths when active tab changes
  useEffect(() => {
    if (desktopTextRef.current) {
      setDesktopUnderlineWidth(desktopTextRef.current.offsetWidth);
    }
    if (mobileTextRef.current) {
      setMobileUnderlineWidth(mobileTextRef.current.offsetWidth);
    }
  }, [activeTab, drawerOpen]);

  // IntersectionObserver to detect which section is in view
  useEffect(() => {
    const observerOptions = {
      root: null,
      rootMargin: "-20% 0px -60% 0px", // Trigger when section is 20% from top
      threshold: 0,
    };

    const observerCallback = (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const sectionId = entry.target.id;

          // Map section IDs to navigation tabs
          // Mission and Vision are part of the About section
          if (sectionId === "featured") {
            setActiveTab("featured");
          } else if (
            sectionId === "about" ||
            sectionId === "mission" ||
            sectionId === "vision"
          ) {
            setActiveTab("about");
          } else if (sectionId === "contact") {
            setActiveTab("contact");
          }
        }
      });
    };

    const observer = new IntersectionObserver(
      observerCallback,
      observerOptions
    );

    // Observe all relevant sections
    const sections = ["featured", "about", "mission", "vision", "contact"];
    const elements = sections
      .map((id) => document.getElementById(id))
      .filter((el) => el !== null);

    elements.forEach((element) => observer.observe(element));

    // Cleanup
    return () => {
      elements.forEach((element) => observer.unobserve(element));
    };
  }, []);

  const handleTabClick = (tab) => {
    setActiveTab(tab);
    setDrawerOpen(false);
    navigateToSection(tab);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 w-full px-2 sm:px-4 md:px-6 lg:px-8 bg-white">
      <div className="w-full max-w-7xl mx-auto mb-6 sm:mb-8 md:mb-10 flex items-center justify-between px-3 sm:px-4 md:px-6 shadow-gray-800 rounded-lg sm:rounded-xl shadow-md bg-white h-16 sm:h-18 md:h-20">
        {/* Left side - Logo + Title */}
        <div
          className="flex items-center gap-2 sm:gap-3 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => window.location.reload()}
        >
          <img
            src="../../../assets/image/LV Logo.png"
            alt="La Verdad Logo"
            className="h-10 w-10 sm:h-12 sm:w-12 md:h-14 md:w-14 rounded-full"
          />
          <h1 className="text-base sm:text-lg md:text-xl font-semibold">
            <span className="text-[#003363] font-SFPro">La Verdad</span>
            <span className="text-[#F28C28] font-SFPro"> OrderFlow</span>
          </h1>
        </div>

        {/* Hamburger button (mobile and tablet) */}
        <button
          className="lg:hidden flex items-center justify-center ml-2 min-w-[44px] min-h-[44px]"
          aria-label="Open navigation"
          onClick={() => setDrawerOpen((v) => !v)}
        >
          <Menu
            size={28}
            className="text-[#003363] sm:w-7 sm:h-7 md:w-8 md:h-8"
          />
        </button>

        {/* Center Navigation (desktop only - lg and above) */}
        <nav className="hidden lg:flex gap-6 xl:gap-10 font-medium h-full items-center">
          {["featured", "about", "contact"].map((tab) => {
            const label =
              tab === "featured"
                ? "Featured"
                : tab === "about"
                ? "About"
                : "Contact Us";
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => handleTabClick(tab)}
                className={`h-16 sm:h-18 md:h-20 px-4 md:px-5 lg:px-6 xl:px-7 font-bold min-w-[90px] md:min-w-[100px] lg:min-w-[110px] flex flex-col items-center justify-center transition-all text-sm md:text-base ${
                  isActive
                    ? "bg-[#0C2340] text-white"
                    : "text-[#0C2340] hover:bg-[#0C2340] hover:text-white"
                }`}
              >
                <span
                  ref={isActive ? desktopTextRef : null}
                  className="inline-block"
                  style={{ pointerEvents: "none" }}
                >
                  {label}
                </span>
                {isActive && (
                  <span
                    className="block mt-1.5 md:mt-2 h-0.5 md:h-1 bg-[#F28C28] rounded-full"
                    style={{ width: desktopUnderlineWidth }}
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Right side - Auth links (desktop only - lg and above) */}
        <div className="hidden lg:flex items-center gap-4 xl:gap-6">
          <NavLink
            to="/login"
            className={({ isActive }) =>
              isActive
                ? "flex items-center gap-2 px-3 md:px-4 py-2 border-2 border-[#003363] bg-[#0C2340] text-white rounded-full font-medium text-sm md:text-base min-h-[44px]"
                : "flex items-center gap-2 px-3 md:px-4 py-2 border-2 border-[#003363] text-[#00396E] rounded-full font-medium hover:bg-[#0C2340] hover:text-white transition text-sm md:text-base min-h-[44px]"
            }
          >
            <User size={18} />
            Log in
          </NavLink>
        </div>
      </div>

      {/* Mobile & Tablet Drawer Navigation */}
      {drawerOpen && (
        <nav
          className="fixed top-0 left-0 w-full h-screen bg-black bg-opacity-30 z-50 flex flex-col"
          onClick={() => setDrawerOpen(false)}
        >
          <div className="bg-white rounded-b-xl mx-4 sm:mx-6 md:mx-8 mt-4 sm:mt-6 shadow-lg flex flex-col">
            {["featured", "about", "contact"].map((tab) => {
              const label =
                tab === "featured"
                  ? "Featured"
                  : tab === "about"
                  ? "About"
                  : "Contact Us";
              const isActive = activeTab === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTabClick(tab);
                  }}
                  className={`w-full py-4 sm:py-5 md:py-6 font-bold flex flex-col items-center justify-center transition-all text-base sm:text-lg md:text-xl min-h-[44px] ${
                    isActive
                      ? "bg-[#0C2340] text-white"
                      : "text-[#0C2340] hover:bg-[#0C2340] hover:text-white"
                  }`}
                >
                  <span
                    ref={isActive ? mobileTextRef : null}
                    className="inline-block"
                    style={{ pointerEvents: "none" }}
                  >
                    {label}
                  </span>
                  {isActive && (
                    <span
                      className="block mt-2 h-0.5 sm:h-1 bg-[#F28C28] rounded-full"
                      style={{ width: mobileUnderlineWidth }}
                    />
                  )}
                </button>
              );
            })}
            {/* Mobile & Tablet login button */}
            <NavLink
              to="/login"
              className={({ isActive }) =>
                isActive
                  ? "flex items-center justify-center gap-2 px-4 sm:px-5 md:px-6 py-3 sm:py-4 border-2 border-[#003363] bg-[#0C2340] text-white rounded-full font-medium m-4 sm:m-5 md:m-6 text-base sm:text-lg min-h-[44px]"
                  : "flex items-center justify-center gap-2 px-4 sm:px-5 md:px-6 py-3 sm:py-4 border-2 border-[#003363] text-[#00396E] rounded-full font-medium hover:bg-[#0C2340] hover:text-white transition m-4 sm:m-5 md:m-6 text-base sm:text-lg min-h-[44px]"
              }
            >
              <User size={20} className="sm:w-6 sm:h-6" />
              Log in
            </NavLink>
          </div>
        </nav>
      )}
    </header>
  );
}
