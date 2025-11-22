import React, { useState } from "react";
import { contactAPI } from "../../services/api";

export default function ContactForm() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });
  const [status, setStatus] = useState({ type: "", message: "" });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus({ type: "", message: "" });

    try {
      await contactAPI.submitContact(formData);
      setStatus({
        type: "success",
        message: "Message sent successfully! We'll get back to you soon.",
      });
      setFormData({ name: "", email: "", message: "" }); // Reset form
    } catch (error) {
      setStatus({
        type: "error",
        message:
          error.response?.data?.message ||
          "Failed to send message. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full bg-gray-200 rounded-xl shadow-lg p-4 sm:p-6 lg:p-8">
      {/* Title */}
      <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-6 sm:mb-8">
        <span className="text-[#163869]">Get </span>
        <span className="text-[#E68B00]">in Touch</span>
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
        {/* Name Input */}
        <div>
          <label
            htmlFor="name"
            className="block text-xs sm:text-sm font-medium text-[#163869] mb-2"
          >
            Name
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Enter your name"
            className="w-full px-0 py-2 sm:py-3 bg-transparent border-0 border-b-2 border-gray-300 focus:outline-none focus:border-[#163869] text-[#163869] placeholder-gray-400 transition-colors text-sm sm:text-base min-h-[44px]"
            required
          />
        </div>

        {/* Email Input */}
        <div>
          <label
            htmlFor="email"
            className="block text-xs sm:text-sm font-medium text-[#163869] mb-2"
          >
            E-mail
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="Enter your e-mail"
            className="w-full px-0 py-2 sm:py-3 bg-transparent border-0 border-b-2 border-gray-300 focus:outline-none focus:border-[#163869] text-[#163869] placeholder-gray-400 transition-colors text-sm sm:text-base min-h-[44px]"
            required
          />
        </div>

        {/* Message Input */}
        <div>
          <label
            htmlFor="message"
            className="block text-xs sm:text-sm font-medium text-[#163869] mb-2"
          >
            Message
          </label>
          <textarea
            id="message"
            name="message"
            value={formData.message}
            onChange={handleChange}
            rows="4"
            placeholder="Write your message here"
            className="w-full px-0 py-2 sm:py-3 bg-transparent border-0 border-b-2 border-gray-300 focus:outline-none focus:border-[#163869] text-[#163869] placeholder-gray-400 resize-none transition-colors text-sm sm:text-base"
            required
          />
        </div>

        {/* Status Message */}
        {status.message && (
          <div
            className={`p-3 rounded-md text-sm sm:text-base ${
              status.type === "success"
                ? "bg-green-50 text-green-800 border border-green-200"
                : "bg-red-50 text-red-800 border border-red-200"
            }`}
          >
            {status.message}
          </div>
        )}

        {/* Submit Button - Right Aligned */}
        <div className="flex justify-end pt-2 sm:pt-4">
          <button
            type="submit"
            disabled={loading}
            className={`px-6 sm:px-8 py-2.5 sm:py-3 rounded-full text-white font-semibold transition-all text-sm sm:text-base min-h-[44px] min-w-[120px] ${
              loading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-[#163869] hover:bg-[#0C2340] hover:shadow-lg"
            }`}
          >
            {loading ? "Sending..." : "Send Message"}
          </button>
        </div>
      </form>

      {/* Image at the bottom */}
      <div className="w-full mt-6 sm:mt-8 rounded-xl overflow-hidden shadow-lg">
        <img
          src="../../assets/image/LandingPage.png"
          alt="La Verdad Christian College"
          className="w-full h-40 sm:h-48 lg:h-64 object-cover"
        />
      </div>
    </div>
  );
}
