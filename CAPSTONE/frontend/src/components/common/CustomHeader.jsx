import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
// import logo from "../../assets/logo.png";

const CustomHeader = ({ showSearch }) => {
  const { userRole } = useAuth();

  return (
    <div className="bg-white/95 border border-[#efefef] h-[95px] rounded-[15px] flex items-center justify-between px-8">
      <div className="flex items-center gap-4">
        {/* <img src={logo} alt="Logo" className="w-[78px] h-[78px]" /> */}
        <h1 className="text-[25px] font-medium">
          <span className="text-[#003363]">La Verdad </span>
          <span className="text-[#e68b00]">OrderFlow</span>
        </h1>
      </div>

      {showSearch && (
        <div className="relative">
          <input
            type="text"
            placeholder="Search for items"
            className="bg-[#f3f3f3] border border-[#f3f3f3] w-[490px] h-[67px] rounded-[50px] pl-14 pr-12 text-[20px] focus:outline-none"
          />
          <button className="absolute right-4 top-1/2 -translate-y-1/2">
            <i className="fas fa-search text-[#00396e]/60"></i>
          </button>
        </div>
      )}

      <div className="flex items-center gap-6">
        <button className="relative">
          <i className="fas fa-shopping-cart text-2xl text-[#00396e]"></i>
          <span className="absolute -top-2 -right-2 bg-[#e68b00] text-white w-5 h-5 rounded-full text-xs flex items-center justify-center">
            0
          </span>
        </button>

        <div className="flex items-center gap-3">
          <div className="relative">
            <img
              src="https://via.placeholder.com/77"
              alt="Profile"
              className="w-[77px] h-[76px] rounded-full border-2 border-[#e68b00] object-cover"
            />
          </div>
          <div className="flex flex-col">
            <span className="text-[25px] text-[#003363]">John D.</span>
            <span className="text-[14px] text-[#e68b00]">Student</span>
          </div>
          <button>
            <i className="fas fa-chevron-down text-[#003363]"></i>
          </button>
        </div>
      </div>
      <div className="flex items-center gap-4">
        {userRole === "admin" && (
          <Link to="/admin" className="text-sm text-[#003363] font-medium">
            Admin
          </Link>
        )}
      </div>
    </div>
  );
};

export default CustomHeader;
