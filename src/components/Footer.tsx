import logo from "@/assets/aziza-logo.png";
import { Facebook, Instagram, Linkedin, MapPin, Phone, Mail, Clock } from "lucide-react";
import { Button } from "./ui/button";

const Footer = () => {
  return (
    <>
      <footer className="bg-primary text-primary-foreground py-16">
        <div className="container mx-auto px-4">
          {/* Brand Section - Full Width Top */}
          <div className="mb-12 pb-12 border-b border-primary-foreground/20">
            <div className="max-w-2xl">
              <img src={logo} alt="Aziza Home" className="h-20 mb-6 brightness-0 invert" />
              <p className="text-base opacity-90 leading-relaxed mb-6">
                We specialize in A-Z stylish furniture packages, offering a seamless and hassle-free way to furnish your space with elegance and efficiency.
              </p>
              <div className="flex gap-3">
                <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="w-11 h-11 rounded-full bg-primary-foreground/20 hover:bg-primary-foreground/30 flex items-center justify-center transition-colors">
                  <Facebook className="w-5 h-5" />
                </a>
                <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="w-11 h-11 rounded-full bg-primary-foreground/20 hover:bg-primary-foreground/30 flex items-center justify-center transition-colors">
                  <Instagram className="w-5 h-5" />
                </a>
                <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="w-11 h-11 rounded-full bg-primary-foreground/20 hover:bg-primary-foreground/30 flex items-center justify-center transition-colors">
                  <Linkedin className="w-5 h-5" />
                </a>
              </div>
            </div>
          </div>

          {/* Links Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10 mb-12">
            {/* Information */}
            <div>
              <h3 className="font-semibold text-lg mb-5">Information</h3>
              <ul className="space-y-3 text-sm opacity-90">
                <li><a href="#" className="hover:opacity-100 transition-opacity">Privacy Policy</a></li>
                <li><a href="#" className="hover:opacity-100 transition-opacity">Terms & Conditions</a></li>
                <li><a href="#" className="hover:opacity-100 transition-opacity">Refund Policy</a></li>
                <li><a href="#" className="hover:opacity-100 transition-opacity">Shipping Policy</a></li>
              </ul>
            </div>

            {/* Quick Link */}
            <div>
              <h3 className="font-semibold text-lg mb-5">Quick Link</h3>
              <ul className="space-y-3 text-sm opacity-90">
                <li><a href="/" className="hover:opacity-100 transition-opacity">Search</a></li>
                <li><a href="#about" className="hover:opacity-100 transition-opacity">About Us</a></li>
                <li><a href="#contact" className="hover:opacity-100 transition-opacity">Contact Us</a></li>
                <li><a href="#" className="hover:opacity-100 transition-opacity">Order Tracking</a></li>
              </ul>
            </div>

            {/* Get In Touch */}
            <div>
              <h3 className="font-semibold text-lg mb-5">Get In Touch</h3>
              <ul className="space-y-3 text-sm opacity-90">
                <li className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>Forte Tower 1, Downtown Dubai, UAE</span>
                </li>
                <li className="flex items-center gap-3">
                  <Phone className="w-4 h-4 flex-shrink-0" />
                  <a href="tel:+971559779635" className="hover:opacity-100 transition-opacity">+971 55 977 9635</a>
                </li>
                <li className="flex items-center gap-3">
                  <Mail className="w-4 h-4 flex-shrink-0" />
                  <a href="mailto:info@azizahomes.com" className="hover:opacity-100 transition-opacity">info@azizahomes.com</a>
                </li>
                <li className="flex items-center gap-3">
                  <Clock className="w-4 h-4 flex-shrink-0" />
                  <span>Mon - Fri: 9:00 AM - 6:00 PM</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-primary-foreground/20 pt-6 text-center text-sm opacity-80">
            <p>© {new Date().getFullYear()} Aziza Home. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* WhatsApp Floating Button */}
      <a
        href="https://wa.me/971559779635"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-[#25D366] hover:bg-[#20BA5A] rounded-full flex items-center justify-center shadow-lg transition-colors group"
        aria-label="Chat on WhatsApp"
      >
        <svg
          className="w-8 h-8 text-white"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
        </svg>
      </a>
    </>
  );
};

export default Footer;
