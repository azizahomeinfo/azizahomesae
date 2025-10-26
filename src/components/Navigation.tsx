import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Link } from "react-router-dom";
import logo from "@/assets/aziza-logo.png";
import { CartDrawer } from "./CartDrawer";

const Navigation = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
      setIsMenuOpen(false);
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-md border-b border-border">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="transition-smooth hover:opacity-70">
            <img src={logo} alt="Aziza Home" className="h-14 md:h-16" />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <Link to="/portfolio" className="text-sm font-medium text-foreground hover:text-primary transition-smooth">
              Portfolio
            </Link>
            <button onClick={() => scrollToSection("packages")} className="text-sm font-medium text-foreground hover:text-primary transition-smooth">
              Packages
            </button>
            <button onClick={() => scrollToSection("about")} className="text-sm font-medium text-foreground hover:text-primary transition-smooth">
              About
            </button>
            <button onClick={() => scrollToSection("contact")} className="text-sm font-medium text-foreground hover:text-primary transition-smooth">
              Contact
            </button>
            <CartDrawer />
          </div>

          {/* Mobile Menu Button & Cart */}
          <div className="md:hidden flex items-center gap-2">
            <CartDrawer />
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 text-foreground">
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden mt-4 pb-4 flex flex-col gap-4">
            <Link to="/portfolio" className="text-sm font-medium text-foreground hover:text-primary transition-smooth text-left" onClick={() => setIsMenuOpen(false)}>
              Portfolio
            </Link>
            <button onClick={() => scrollToSection("packages")} className="text-sm font-medium text-foreground hover:text-primary transition-smooth text-left">
              Packages
            </button>
            <button onClick={() => scrollToSection("about")} className="text-sm font-medium text-foreground hover:text-primary transition-smooth text-left">
              About
            </button>
            <button onClick={() => scrollToSection("contact")} className="text-sm font-medium text-foreground hover:text-primary transition-smooth text-left">
              Contact
            </button>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navigation;
