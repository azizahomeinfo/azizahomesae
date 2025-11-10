import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Helmet } from "react-helmet-async";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <>
      <Helmet>
        <title>Page Not Found - 404 | Aziza Home Dubai Interior Design</title>
        <meta name="description" content="The page you're looking for doesn't exist. Return to Aziza Home to explore our interior design services, furniture packages, and portfolio." />
        <meta name="robots" content="noindex, follow" />
      </Helmet>
      
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="text-center">
          <h1 className="mb-4 text-4xl font-bold">404</h1>
          <p className="mb-4 text-xl text-gray-600">Oops! Page not found</p>
          <a href="/" className="text-blue-500 underline hover:text-blue-700">
            Return to Home
          </a>
        </div>
      </div>
    </>
  );
};

export default NotFound;
