import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, AlertCircle, RefreshCw, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface GscSite { siteUrl: string; permissionLevel: string }
interface GscSitemap {
  path: string;
  lastSubmitted?: string;
  lastDownloaded?: string;
  isPending?: boolean;
  errors?: string;
  warnings?: string;
  contents?: { submitted?: string; indexed?: string; type?: string }[];
}
interface GscStatus {
  identifier: string;
  sites?: { siteEntry?: GscSite[] };
  sitemaps?: { status: number; body?: { sitemap?: GscSitemap[] } };
}

interface AbRow {
  experiment: string;
  variant: "A" | "B";
  event_type: "view" | "cta_click";
}

interface AbStat {
  variant: "A" | "B";
  views: number;
  clicks: number;
  cvr: number;
}

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
  const [gsc, setGsc] = useState<GscStatus | null>(null);
  const [gscLoading, setGscLoading] = useState(false);
  const [gscError, setGscError] = useState<string | null>(null);
  const [resubmitting, setResubmitting] = useState(false);
  const [abStats, setAbStats] = useState<AbStat[] | null>(null);
  const [abLoading, setAbLoading] = useState(false);
  const [abError, setAbError] = useState<string | null>(null);

  const SITE = "https://www.azizahomes.com/";

  const loadGsc = async () => {
    setGscLoading(true);
    setGscError(null);
    const { data, error } = await supabase.functions.invoke("gsc-admin", {
      body: { action: "status", site: SITE },
    });
    if (error) setGscError(error.message);
    else setGsc(data as GscStatus);
    setGscLoading(false);
  };

  const resubmitSitemap = async () => {
    setResubmitting(true);
    await supabase.functions.invoke("gsc-admin", {
      body: { action: "submit_sitemap", site: SITE },
    });
    await loadGsc();
    setResubmitting(false);
  };

  const loadAbStats = async () => {
    setAbLoading(true);
    setAbError(null);
    const { data, error } = await supabase
      .from("ab_events")
      .select("experiment,variant,event_type")
      .eq("experiment", "hero_headline_v1")
      .limit(10000);
    if (error) {
      setAbError(error.message);
      setAbLoading(false);
      return;
    }
    const rows = (data ?? []) as AbRow[];
    const tally: Record<"A" | "B", { views: number; clicks: number }> = {
      A: { views: 0, clicks: 0 },
      B: { views: 0, clicks: 0 },
    };
    for (const r of rows) {
      if (r.event_type === "view") tally[r.variant].views += 1;
      else tally[r.variant].clicks += 1;
    }
    setAbStats(
      (["A", "B"] as const).map((v) => ({
        variant: v,
        views: tally[v].views,
        clicks: tally[v].clicks,
        cvr: tally[v].views ? (tally[v].clicks / tally[v].views) * 100 : 0,
      })),
    );
    setAbLoading(false);
  };

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
    loadGsc();
    loadAbStats();
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

  const httpsVerified = gsc?.sites?.siteEntry?.some(
    (s) => s.siteUrl === SITE && s.permissionLevel?.toLowerCase().includes("owner"),
  );
  const sitemap = gsc?.sitemaps?.body?.sitemap?.[0];

  return (
    <>
      <Helmet>
        <title>SEO Status Dashboard | Aziza Home Technical Monitoring</title>
        <meta name="description" content="Real-time SEO health monitoring for Aziza Home. Check sitemap, robots.txt, structured data, and meta tags status." />
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

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  {gscLoading ? (
                    <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
                  ) : httpsVerified ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : gscError ? (
                    <XCircle className="h-5 w-5 text-red-600" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-yellow-600" />
                  )}
                  <span>Google Search Console</span>
                  <Badge variant="outline" className="ml-auto">{SITE}</Badge>
                </CardTitle>
                <CardDescription>
                  Verification status and latest sitemap submission for the HTTPS property.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {gscError && (
                  <p className="text-sm text-red-600 font-mono">Error: {gscError}</p>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-md border p-3">
                    <div className="text-xs uppercase text-muted-foreground mb-1">HTTPS verification</div>
                    <div className="font-medium">
                      {httpsVerified ? "Verified (siteOwner)" : gsc ? "Not verified" : "—"}
                    </div>
                    {gsc?.sites?.siteEntry?.length ? (
                      <ul className="mt-2 text-xs text-muted-foreground space-y-1">
                        {gsc.sites.siteEntry.map((s) => (
                          <li key={s.siteUrl} className="font-mono break-all">
                            {s.siteUrl} — {s.permissionLevel}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>

                  <div className="rounded-md border p-3">
                    <div className="text-xs uppercase text-muted-foreground mb-1">Latest sitemap submission</div>
                    {sitemap ? (
                      <div className="space-y-1 text-sm">
                        <div className="font-mono break-all text-xs">{sitemap.path}</div>
                        <div>Submitted: {sitemap.lastSubmitted ? new Date(sitemap.lastSubmitted).toLocaleString() : "—"}</div>
                        <div>Downloaded: {sitemap.lastDownloaded ? new Date(sitemap.lastDownloaded).toLocaleString() : "—"}</div>
                        <div>
                          URLs submitted: {sitemap.contents?.[0]?.submitted ?? "0"} · indexed: {sitemap.contents?.[0]?.indexed ?? "0"}
                        </div>
                        <div>
                          Errors: {sitemap.errors ?? "0"} · Warnings: {sitemap.warnings ?? "0"} · Pending: {sitemap.isPending ? "yes" : "no"}
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">No sitemap submitted yet.</div>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button onClick={loadGsc} variant="outline" size="sm" disabled={gscLoading}>
                    <RefreshCw className={`mr-2 h-4 w-4 ${gscLoading ? "animate-spin" : ""}`} />
                    Refresh
                  </Button>
                  <Button onClick={resubmitSitemap} size="sm" disabled={resubmitting || !httpsVerified}>
                    {resubmitting ? "Resubmitting…" : "Resubmit sitemap.xml"}
                  </Button>
                </div>
              </CardContent>
            </Card>

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