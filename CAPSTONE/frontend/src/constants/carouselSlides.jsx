import React, { useState } from "react";

const uniforms = [
  {
    id: "uniform-1",
    src: "../../assets/image/card1.png",
    alt: "Female Uniform",
    text: "Higher Education",
  },
  {
    id: "uniform-2",
    src: "../../assets/image/card2.png",
    alt: "Male Uniform",
    text: "Basic Education",
  },
  {
    id: "uniform-3",
    src: "../../assets/image/card3.png",
    alt: "Sailor Uniform",
    text: "Basic Education Polo",
  },
];

const carouselSlides = [
  {
    type: "main",
    content: (
      <div className="relative w-full h-[40vh] sm:h-[50vh] md:h-[60vh] lg:h-[70vh]">
        {/* Text BEHIND the image */}
        <h1 className="absolute px-2 sm:px-4 md:px-8 py-2 sm:py-4 md:py-6 tracking-[-3px] sm:tracking-[-5px] md:tracking-[-10px] leading-none text-[32px] sm:text-[50px] md:text-[80px] lg:text-[130px] font-SFRegular text-[#00396E] opacity-100 z-0">
          La Verdad{" "}
          <span className="text-[#f59301] drop-shadow-lg leading-[28px] sm:leading-[40px] md:leading-[70px] lg:leading-[90px] text-[32px] sm:text-[50px] md:text-[80px] lg:text-[130px] flex font-SFRegular">
            OrderFlow
          </span>
        </h1>

        <p className="absolute right-2 sm:right-4 md:right-8 top-4 sm:top-6 md:top-10 font-SFRegular text-xs sm:text-sm md:text-lg lg:text-xl text-[#00396E] opacity-100 z-0 leading-tight">
          A seamless Order Tracking for <br />
          <span className="text-[#E68B00]">School Uniform and Items</span>
        </p>

        {/* Foreground Image */}
        <img
          src="../../assets/image/LandingPage.png"
          alt="La Verdad Christian College"
          className="relative z-10 w-full h-full object-cover shadow-gray-800 rounded-lg sm:rounded-xl shadow-md bg-black bg-opacity-10"
        />
      </div>
    ),
  },
  {
    type: "features",
    content: null, // This slide is dynamic below
  },
];

function FeatureCarousel() {
  const [mainIndex, setMainIndex] = useState(0);
  const [displayedUniforms, setDisplayedUniforms] = useState([...uniforms]);

  // Handle circular navigation - move 2nd to 1st, 1st to last
  const handleNext = () => {
    setDisplayedUniforms((prev) => {
      const newArray = [...prev];
      const firstItem = newArray.shift(); // Remove first item
      newArray.push(firstItem); // Add it to the end
      return newArray;
    });
  };

  // Handle back navigation - move last to 1st, 1st to 2nd
  const handleBack = () => {
    setDisplayedUniforms((prev) => {
      const newArray = [...prev];
      const lastItem = newArray.pop(); // Remove last item
      newArray.unshift(lastItem); // Add it to the beginning
      return newArray;
    });
  };

  // Uniform Cards - BORDERLESS design with shadow only
  // Mobile (375px, 425px): show 1 card
  // Tablet (768px - md): show 2 cards
  // Desktop (1024px+ - lg/xl): show all 3 cards
  const renderUniformCards = () => (
    <div className="flex gap-2 sm:gap-3 md:gap-3 lg:gap-5 xl:gap-6 justify-end items-end mt-2 sm:mt-3 md:mt-3 lg:mt-4 flex-nowrap">
      {displayedUniforms.map((uniform, idx) => (
        <div
          key={uniform.id}
          className={`relative flex flex-col items-center justify-center
            rounded-lg sm:rounded-xl shadow-lg bg-white transition-all duration-500 ease-in-out
            w-[90px] sm:w-[110px] md:w-[130px] lg:w-[160px] xl:w-[220px]
            h-[130px] sm:h-[150px] md:h-[180px] lg:h-[220px] xl:h-[290px]
            transform
            ${
              idx === 0
                ? "bg-gradient-to-b from-[#fef3e2]/80 via-white/90 to-[#e8f4f8]/80 scale-105"
                : idx === 1
                ? "scale-100 hidden md:flex lg:flex xl:flex"
                : "scale-95 lg:scale-100 hidden lg:flex xl:flex"
            }
          `}
          style={{ zIndex: idx === 0 ? 2 : 1 }}
        >
          <img
            src={uniform.src}
            alt={uniform.alt}
            className="w-full h-[95px] sm:h-[110px] md:h-[135px] lg:h-[165px] xl:h-[220px] object-contain transition-all duration-500 ease-in-out"
          />
        </div>
      ))}
    </div>
  );

  return (
    <div className="relative w-full h-[40vh] sm:h-[50vh] md:h-[60vh] lg:h-[70vh]">
      {/* Background Image and Overlay for features slide will be placed inside the centered wrapper below so overlays align to image bounds */}

      {/* Main carousel display */}
      <div className="relative z-20 w-full h-full">
        {mainIndex === 0 ? (
          carouselSlides[mainIndex].content
        ) : (
          <div className="relative w-full h-full">
            {/* Full-width wrapper to match first slide dimensions */}
            <div className="relative w-full h-full">
              {/* Building background and overlay scoped to this wrapper */}
              <img
                src="../../assets/image/LandingPage.png"
                alt="Building Background"
                className="absolute z-10 w-full h-full object-cover shadow-gray-800 rounded-lg sm:rounded-xl shadow-md bg-black bg-opacity-10"
              />
              <div className="absolute inset-0 bg-white opacity-80 z-10" />
              <div className="relative z-20 flex flex-col md:flex-row h-full items-end gap-2 sm:gap-4 md:gap-8">
                {/* LEFT: Foreground Text over Background, top-aligned */}
                <div className="absolute left-2 sm:left-4 md:left-10 top-6 sm:top-8 md:top-10 max-w-[200px] sm:max-w-xs md:max-w-md z-30">
                  <p className="text-[10px] sm:text-xs md:text-sm lg:text-[17px] text-[#00396E] mb-1 sm:mb-2 font-semibold py-0.5 sm:py-1 md:py-2 px-1 sm:px-2 md:px-4">
                    La Verdad <span className="text-[#E68B00]">OrderFlow</span>
                  </p>
                  <div className="px-2 sm:px-4 md:px-10 lg:px-20 pt-4 sm:pt-8 md:pt-12 lg:pt-20">
                    <h2 className="text-xl sm:text-2xl md:text-4xl lg:text-5xl xl:text-[70px] font-bold text-[#00396E] leading-tight">
                      School <br />{" "}
                      <span className="text-[#E68B00]">Uniforms</span>
                    </h2>
                    <hr className="border-1 sm:border-2 md:border-4 border-[#f59301] w-[100px] sm:w-[150px] md:w-[250px] lg:w-[360px] my-1 sm:my-2" />
                    <p className="text-[10px] sm:text-xs md:text-sm lg:text-base xl:text-lg text-[#003363] mb-2 sm:mb-4 font-medium leading-tight">
                      School Uniforms from Basic Education to Higher Education
                      are now Available
                    </p>
                    <button className="mt-1 sm:mt-2 md:mt-4 px-3 sm:px-4 md:px-8 py-1.5 sm:py-2 md:py-3 border-2 md:border-4 border-[#f59301] text-[#f59301] rounded-full font-bold shadow hover:bg-orange-50 hover:text-orange-600 transition w-fit text-xs sm:text-sm md:text-base min-h-[44px] flex items-center justify-center">
                      Order Now
                    </button>
                  </div>
                </div>

                {/* RIGHT: Carousel - RIGHT-ALIGNED with borderless design */}
                <div className="absolute right-2 sm:right-3 md:right-4 lg:right-6 xl:right-8 top-4 sm:top-5 md:top-6 lg:top-8 xl:top-10 z-40">
                  <div className="flex flex-col gap-1.5 sm:gap-2 md:gap-2 lg:gap-3 xl:gap-3 items-end">
                    {/* Top section: Back and Next buttons */}
                    <div className="flex gap-1.5 sm:gap-2 items-center justify-end">
                      <button
                        className="px-2.5 sm:px-3 md:px-4 lg:px-5 py-1.5 sm:py-1.5 md:py-2 border border-[#00396E] sm:border-2 text-[#00396E] bg-white rounded-full font-bold shadow hover:bg-orange-50 hover:text-orange-600 transition text-[10px] sm:text-xs md:text-sm lg:text-base min-h-[44px] min-w-[55px] sm:min-w-[60px] md:min-w-[65px] lg:min-w-[70px] flex items-center justify-center"
                        onClick={handleBack}
                        aria-label="Back"
                      >
                        Back
                      </button>
                      <button
                        className="px-2.5 sm:px-3 md:px-4 lg:px-5 py-1.5 sm:py-1.5 md:py-2 border border-[#00396E] sm:border-2 text-[#00396E] bg-white rounded-full font-bold shadow hover:bg-orange-50 hover:text-orange-600 transition text-[10px] sm:text-xs md:text-sm lg:text-base min-h-[44px] min-w-[55px] sm:min-w-[60px] md:min-w-[65px] lg:min-w-[70px] flex items-center justify-center"
                        onClick={handleNext}
                        aria-label="Next"
                      >
                        Next
                      </button>
                    </div>

                    {/* Middle section: Text label and decorative line (line hidden on tablet) */}
                    <div className="flex flex-row items-center gap-2 md:gap-2 lg:gap-3 justify-end">
                      {/* Text label - positioned below buttons */}
                      <span className="text-[#00396E] font-medium text-[10px] sm:text-xs md:text-sm lg:text-base xl:text-lg whitespace-nowrap">
                        {displayedUniforms[0].text}
                      </span>

                      {/* Decorative line - HIDDEN on tablet (md), shown on mobile and desktop */}
                      <span className="h-0.5 sm:h-0.5 md:hidden lg:inline-block lg:h-1 w-10 sm:w-14 lg:w-24 xl:w-32 bg-[#f59301]"></span>
                    </div>

                    {/* Bottom section: Uniform cards - right-aligned */}
                    <div className="flex items-center gap-2 sm:gap-2 md:gap-3 lg:gap-4 justify-end">
                      {renderUniformCards()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main carousel navigation buttons */}
      <button
        className="absolute left-1 sm:left-2 md:left-4 top-1/2 transform -translate-y-1/2 w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12 rounded-full bg-[#f59301] text-white flex items-center justify-center shadow hover:bg-orange-700 z-30 text-sm sm:text-base md:text-lg min-w-[44px] min-h-[44px]"
        onClick={() =>
          setMainIndex(
            (prev) => (prev - 1 + carouselSlides.length) % carouselSlides.length
          )
        }
        aria-label="Carousel Previous"
      >
        &#8592;
      </button>
      <button
        className="absolute right-1 sm:right-2 md:right-4 top-1/2 transform -translate-y-1/2 w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12 rounded-full bg-[#f59301] text-white flex items-center justify-center shadow hover:bg-orange-700 z-30 text-sm sm:text-base md:text-lg min-w-[44px] min-h-[44px]"
        onClick={() =>
          setMainIndex((prev) => (prev + 1) % carouselSlides.length)
        }
        aria-label="Carousel Next"
      >
        &#8594;
      </button>
    </div>
  );
}

export default FeatureCarousel;
