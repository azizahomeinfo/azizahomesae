import { MapPin, Star, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface GoogleBusinessIntegrationProps {
  // Once Google Business Profile is created, add the profile URL here
  profileUrl?: string;
  // Add your Google Maps embed URL here
  mapsEmbedUrl?: string;
  showReviews?: boolean;
}

/**
 * Google Business Integration Component
 * 
 * This component will display your Google Business Profile integration.
 * 
 * SETUP INSTRUCTIONS:
 * 1. Create and verify your Google Business Profile (see GOOGLE_BUSINESS_PROFILE_SETUP.md)
 * 2. Once verified, add your profile URL and maps embed URL below
 * 3. Enable this component in your Contact page or Footer
 * 
 * Example URLs:
 * - profileUrl: "https://g.page/your-business-name"
 * - mapsEmbedUrl: "https://www.google.com/maps/embed?pb=..."
 */
const GoogleBusinessIntegration = ({ 
  profileUrl = "", 
  mapsEmbedUrl = "",
  showReviews = true 
}: GoogleBusinessIntegrationProps) => {
  
  // If no profile URL is set, show setup instructions
  if (!profileUrl) {
    return (
      <Card className="p-6 bg-primary/5 border-primary/20">
        <div className="flex items-start gap-4">
          <MapPin className="w-8 h-8 text-primary flex-shrink-0 mt-1" />
          <div>
            <h3 className="text-lg font-semibold mb-2">Find Us on Google</h3>
            <p className="text-muted-foreground text-sm mb-4">
              We're setting up our Google Business Profile! Soon you'll be able to find us on Google Maps,
              read reviews from our clients, and get directions to our showroom.
            </p>
            <p className="text-xs text-muted-foreground">
              <strong>For Admin:</strong> See GOOGLE_BUSINESS_PROFILE_SETUP.md for setup instructions.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Google Maps Embed */}
      {mapsEmbedUrl && (
        <div className="w-full h-[400px] rounded-lg overflow-hidden border border-border">
          <iframe
            src={mapsEmbedUrl}
            width="100%"
            height="100%"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="Aziza Home Location"
          />
        </div>
      )}

      {/* Google Business Profile CTA */}
      <Card className="p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <MapPin className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-lg font-semibold mb-1">Visit Our Google Business Profile</h3>
              <p className="text-sm text-muted-foreground mb-2">
                View our location, hours, photos, and client reviews on Google.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="lg"
            onClick={() => window.open(profileUrl, '_blank')}
            className="flex-shrink-0"
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            View on Google
          </Button>
        </div>
      </Card>

      {/* Reviews CTA */}
      {showReviews && (
        <Card className="p-6 bg-primary/5 border-primary/20">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <Star className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-lg font-semibold mb-1">Love Our Work?</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  Share your experience and help others discover Aziza Home. Your review means the world to us!
                </p>
              </div>
            </div>
            <Button
              size="lg"
              onClick={() => window.open(`${profileUrl}/review`, '_blank')}
              className="flex-shrink-0"
            >
              <Star className="mr-2 h-4 w-4" />
              Write a Review
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};

export default GoogleBusinessIntegration;
