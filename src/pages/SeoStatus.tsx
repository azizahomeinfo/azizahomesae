import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, AlertCircle, RefreshCw, ExternalLink } from "lucide-react";

interface StatusCheck {
  name: string;
  status: "success" | "error" | "warning" | "checking";
  message: string;
  details?: string;
  url?: string;
}

const SeoStatus = () => {
  const [checks, setChecks] = useState<StatusCheck[]>([
    { name: "Sitemap.xml", status: "checking", message: "Checking..." },
    { name: "Robots.txt", status: "checking", message: "Checking..." },
    { name: "Structured Data", status: "checking", message: "Checking..." },
    { name: "SEO Headers", status: "checking", message: "Checking..." },
  ]);
  const [isChecking, setIsChecking] = useState(false);

  const runChecks = async () => {
    setIsChecking(true);
    const newChecks: StatusCheck[] = [];

    // Check Sitemap
    try {
      const sitemapUrl = `${window.location.origin}/sitemap.xml`;
      const sitemapResponse = await fetch(sitemapUrl, { method: "HEAD" });
      const contentType = sitemapResponse.headers.get("content-type") || "";
      
      if (sitemapResponse.ok) {
        if (contentType.includes("application/xml") || contentType.includes("text/xml")) {
          newChecks.push({
            name: "Sitemap.xml",
            status: "success",
            message: "Accessible with correct XML content-type",
            details: `Content-Type: ${contentType}`,
            url: sitemapUrl,
          });
        } else {
          newChecks.push({
            name: "Sitemap.xml",
            status: "warning",
            message: "Accessible but wrong content-type",
            details: `Expected: application/xml, Got: ${contentType}`,
            url: sitemapUrl,
          });
        }
      } else {
        newChecks.push({
          name: "Sitemap.xml",
          status: "error",
          message: `HTTP ${sitemapResponse.status} - Not accessible`,
          details: sitemapResponse.statusText,
          url: sitemapUrl,
        });
      }
    } catch (error) {
      newChecks.push({
        name: "Sitemap.xml",
        status: "error",
        message: "Failed to fetch sitemap",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }

    // Check Robots.txt
    try {
      const robotsUrl = `${window.location.origin}/robots.txt`;
      const robotsResponse = await fetch(robotsUrl, { method: "HEAD" });
      const contentType = robotsResponse.headers.get("content-type") || "";
      
      if (robotsResponse.ok) {
        if (contentType.includes("text/plain")) {
          newChecks.push({
            name: "Robots.txt",
            status: "success",
            message: "Accessible with correct content-type",
            details: `Content-Type: ${contentType}`,
            url: robotsUrl,
          });
        } else {
          newChecks.push({
            name: "Robots.txt",
            status: "warning",
            message: "Accessible but wrong content-type",
            details: `Expected: text/plain, Got: ${contentType}`,
            url: robotsUrl,
          });
        }
      } else {
        newChecks.push({
          name: "Robots.txt",
          status: "error",
          message: `HTTP ${robotsResponse.status} - Not accessible`,
          details: robotsResponse.statusText,
          url: robotsUrl,
        });
      }
    } catch (error) {
      newChecks.push({
        name: "Robots.txt",
        status: "error",
        message: "Failed to fetch robots.txt",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }

    // Check Structured Data
    try {
      const scripts = document.querySelectorAll('script[type="application/ld+json"]');
      if (scripts.length > 0) {
        const schemas: string[] = [];
        scripts.forEach((script) => {
          try {
            const data = JSON.parse(script.textContent || "");
            if (data["@type"]) schemas.push(data["@type"]);
          } catch (e) {
            // Invalid JSON
          }
        });
        
        newChecks.push({
          name: "Structured Data",
          status: "success",
          message: `${scripts.length} JSON-LD schema(s) found`,
          details: schemas.length > 0 ? `Types: ${schemas.join(", ")}` : "Found but unable to parse types",
        });
      } else {
        newChecks.push({
          name: "Structured Data",
          status: "warning",
          message: "No JSON-LD structured data found",
          details: "Consider adding Organization, LocalBusiness, or BreadcrumbList schemas",
        });
      }
    } catch (error) {
      newChecks.push({
        name: "Structured Data",
        status: "error",
        message: "Failed to check structured data",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }

    // Check SEO Headers
    try {
      const metaTitle = document.querySelector("title")?.textContent;
      const metaDescription = document.querySelector('meta[name="description"]')?.getAttribute("content");
      const canonical = document.querySelector('link[rel="canonical"]')?.getAttribute("href");
      
      const issues: string[] = [];
      if (!metaTitle || metaTitle.length < 10) issues.push("Title tag missing or too short");
      if (!metaDescription || metaDescription.length < 50) issues.push("Meta description missing or too short");
      if (!canonical) issues.push("Canonical URL not set");
      
      if (issues.length === 0) {
        newChecks.push({
          name: "SEO Headers",
          status: "success",
          message: "All critical meta tags present",
          details: `Title (${metaTitle?.length || 0} chars), Description (${metaDescription?.length || 0} chars), Canonical set`,
        });
      } else {
        newChecks.push({
          name: "SEO Headers",
          status: "warning",
          message: `${issues.length} issue(s) found`,
          details: issues.join("; "),
        });
      }
    } catch (error) {
      newChecks.push({
        name: "SEO Headers",
        status: "error",
        message: "Failed to check SEO headers",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }

    setChecks(newChecks);
    setIsChecking(false);
  };

  useEffect(() => {
    runChecks();
  }, []);

  const getStatusIcon = (status: StatusCheck["status"]) => {
    switch (status) {
      case "success":
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case "error":
        return <XCircle className="h-5 w-5 text-red-600" />;
      case "warning":
        return <AlertCircle className="h-5 w-5 text-yellow-600" />;
      default:
        return <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: StatusCheck["status"]) => {
    const variants: Record<StatusCheck["status"], "default" | "destructive" | "secondary" | "outline"> = {
      success: "default",
      error: "destructive",
      warning: "secondary",
      checking: "outline",
    };
    
    return (
      <Badge variant={variants[status]} className="ml-auto">
        {status === "checking" ? "Checking..." : status.toUpperCase()}
      </Badge>
    );
  };

  const successCount = checks.filter(c => c.status === "success").length;
  const errorCount = checks.filter(c => c.status === "error").length;
  const warningCount = checks.filter(c => c.status === "warning").length;

  return (
    <>
      <Helmet>
        <title>SEO Status - Aziza Homes</title>
        <meta name="description" content="Monitor SEO health and technical configuration" />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="min-h-screen bg-background">
        <Navigation />
        
        <main className="container mx-auto px-4 py-24">
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="text-center space-y-4">
              <h1 className="text-4xl font-bold text-foreground">SEO Status Dashboard</h1>
              <p className="text-lg text-muted-foreground">
                Monitor the health of SEO-critical files and configurations
              </p>
              
              <div className="flex justify-center gap-4 pt-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">{successCount}</div>
                  <div className="text-sm text-muted-foreground">Passing</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-yellow-600">{warningCount}</div>
                  <div className="text-sm text-muted-foreground">Warnings</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-red-600">{errorCount}</div>
                  <div className="text-sm text-muted-foreground">Errors</div>
                </div>
              </div>

              <Button 
                onClick={runChecks} 
                disabled={isChecking}
                className="mt-4"
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${isChecking ? "animate-spin" : ""}`} />
                Re-run Checks
              </Button>
            </div>

            <div className="space-y-4">
              {checks.map((check, index) => (
                <Card key={index}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                      {getStatusIcon(check.status)}
                      <span>{check.name}</span>
                      {getStatusBadge(check.status)}
                    </CardTitle>
                    <CardDescription>{check.message}</CardDescription>
                  </CardHeader>
                  {(check.details || check.url) && (
                    <CardContent className="space-y-2">
                      {check.details && (
                        <p className="text-sm text-muted-foreground font-mono">
                          {check.details}
                        </p>
                      )}
                      {check.url && (
                        <a
                          href={check.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                        >
                          View File <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>

            <Card className="bg-muted/50">
              <CardHeader>
                <CardTitle>About This Dashboard</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>
                  This dashboard performs real-time checks on critical SEO files and configurations:
                </p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li><strong>Sitemap.xml:</strong> Verifies accessibility and correct XML content-type header</li>
                  <li><strong>Robots.txt:</strong> Checks if the file is accessible with proper content-type</li>
                  <li><strong>Structured Data:</strong> Detects JSON-LD schemas for rich search results</li>
                  <li><strong>SEO Headers:</strong> Validates title tags, meta descriptions, and canonical URLs</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default SeoStatus;