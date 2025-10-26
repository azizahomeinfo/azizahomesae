import logo from "@/assets/aziza-logo.png";

const Footer = () => {
  return (
    <footer className="bg-primary text-primary-foreground py-12">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <img src={logo} alt="Aziza Home" className="h-10 brightness-0 invert" />
          </div>
          <div className="text-center md:text-right text-sm">
            <p className="mb-2">© {new Date().getFullYear()} Aziza Home. All rights reserved.</p>
            <p className="opacity-80">Transforming spaces with timeless design</p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
