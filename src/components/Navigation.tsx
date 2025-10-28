import { useState } from "react";
import { Menu, X, LogOut, LogIn } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import logo from "@/assets/aziza-logo.png";
import { CartDrawer } from "./CartDrawer";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "./ui/button";

const Navigation = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
      setIsMenuOpen(false);
    }
  };

  const handleAuthClick = () => {
    if (user) {
      signOut();
    } else {
      navigate("/auth");
    }
    setIsMenuOpen(false);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-md border-b border-border">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="transition-smooth hover:opacity-70">
            <img src={logo} alt="Aziza Home" className="h-20 md:h-24" />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <Link to="/services" className="text-sm font-medium text-foreground hover:text-primary transition-smooth">
              OUR SERVICES
            </Link>
            <Link to="/portfolio" className="text-sm font-medium text-foreground hover:text-primary transition-smooth">
              PORTFOLIO
            </Link>
            <Link to="/packages" className="text-sm font-medium text-foreground hover:text-primary transition-smooth">
              PACKAGES
            </Link>
            <button onClick={() => scrollToSection("about")} className="text-sm font-medium text-foreground hover:text-primary transition-smooth">
              ABOUT US
            </button>
            <button onClick={() => scrollToSection("contact")} className="text-sm font-medium text-foreground hover:text-primary transition-smooth">
              CONTACT
            </button>
            <CartDrawer />
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleAuthClick}
              className="flex items-center gap-2"
            >
              {user ? (
                <>
                  <LogOut size={16} />
                  Sign Out
                </>
              ) : (
                <>
                  <LogIn size={16} />
                  Sign In
                </>
              )}
            </Button>
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
            <Link to="/services" className="text-sm font-medium text-foreground hover:text-primary transition-smooth text-left" onClick={() => setIsMenuOpen(false)}>
              OUR SERVICES
            </Link>
            <Link to="/portfolio" className="text-sm font-medium text-foreground hover:text-primary transition-smooth text-left" onClick={() => setIsMenuOpen(false)}>
              PORTFOLIO
            </Link>
            <Link to="/packages" className="text-sm font-medium text-foreground hover:text-primary transition-smooth text-left" onClick={() => setIsMenuOpen(false)}>
              PACKAGES
            </Link>
            <button onClick={() => scrollToSection("about")} className="text-sm font-medium text-foreground hover:text-primary transition-smooth text-left">
              ABOUT US
            </button>
            <button onClick={() => scrollToSection("contact")} className="text-sm font-medium text-foreground hover:text-primary transition-smooth text-left">
              CONTACT
            </button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleAuthClick}
              className="flex items-center gap-2 justify-start"
            >
              {user ? (
                <>
                  <LogOut size={16} />
                  Sign Out
                </>
              ) : (
                <>
                  <LogIn size={16} />
                  Sign In
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navigation;
