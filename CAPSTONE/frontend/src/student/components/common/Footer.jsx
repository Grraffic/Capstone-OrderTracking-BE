import React from 'react';
import { Phone, Mail, MapPin, Facebook, Instagram, Twitter } from 'lucide-react';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 text-white mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Logo and Description */}
          <div className="col-span-1 md:col-span-2 lg:col-span-1">
            <div className="flex items-center space-x-2 mb-4">
              <img 
                src="/images/logo.png" 
                alt="La Verdad Logo" 
                className="h-12 w-12"
                onError={(e) => {
                  e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Ccircle cx="50" cy="50" r="40" fill="%23ffffff"/%3E%3Ctext x="50" y="60" font-size="40" text-anchor="middle" fill="%233B82F6"%3ELV%3C/text%3E%3C/svg%3E';
                }}
              />
              <div>
                <h3 className="text-lg font-bold">La Verdad Christian College</h3>
                <p className="text-sm text-gray-400">OrderFlow System</p>
              </div>
            </div>
            <p className="text-sm text-gray-400">
              Your trusted partner for official school uniforms and merchandise.
            </p>
          </div>

          {/* Contact Information */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Contact Us</h4>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <Phone className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-300">(043) 778-1234</p>
                  <p className="text-sm text-gray-300">(043) 778-5678</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Mail className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-gray-300">info@laverdad.edu.ph</p>
              </div>
              <div className="flex items-start space-x-3">
                <MapPin className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-gray-300">
                  Apolonio Samson, Calamba City, Laguna, Philippines
                </p>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <a href="#about" className="text-sm text-gray-300 hover:text-orange-500 transition-colors">
                  About Us
                </a>
              </li>
              <li>
                <a href="#products" className="text-sm text-gray-300 hover:text-orange-500 transition-colors">
                  Products
                </a>
              </li>
              <li>
                <a href="#orders" className="text-sm text-gray-300 hover:text-orange-500 transition-colors">
                  My Orders
                </a>
              </li>
              <li>
                <a href="#faq" className="text-sm text-gray-300 hover:text-orange-500 transition-colors">
                  FAQ
                </a>
              </li>
              <li>
                <a href="#support" className="text-sm text-gray-300 hover:text-orange-500 transition-colors">
                  Support
                </a>
              </li>
            </ul>
          </div>

          {/* Social Media */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Follow Us</h4>
            <div className="flex space-x-4">
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-orange-500 transition-colors"
              >
                <Facebook className="w-5 h-5" />
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-orange-500 transition-colors"
              >
                <Instagram className="w-5 h-5" />
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-orange-500 transition-colors"
              >
                <Twitter className="w-5 h-5" />
              </a>
            </div>
            <div className="mt-6">
              <p className="text-sm text-gray-400">
                Stay updated with our latest products and announcements.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-800 mt-8 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <p className="text-sm text-gray-400">
              © {currentYear} La Verdad Christian College. All rights reserved.
            </p>
            <div className="flex space-x-6">
              <a href="#privacy" className="text-sm text-gray-400 hover:text-orange-500 transition-colors">
                Privacy Policy
              </a>
              <a href="#terms" className="text-sm text-gray-400 hover:text-orange-500 transition-colors">
                Terms of Service
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

