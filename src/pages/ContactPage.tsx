import { useState } from "react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { IntakeFormDialog } from "@/components/IntakeFormDialog";
import { MessageSquare, Phone, Mail, MapPin, Clock } from "lucide-react";

const ContactPage = () => {
  const [isFormOpen, setIsFormOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="pt-32 pb-20">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-16 animate-fade-in">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-light mb-6 text-foreground">
              Need Custom Design?
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
              Looking for something beyond our standard furnishing packages? Share your unique vision with us and we'll create a personalized design plan tailored specifically to your needs.
            </p>
            <Button 
              size="lg" 
              onClick={() => setIsFormOpen(true)}
              className="text-lg px-8 py-6 bg-primary hover:bg-primary/90"
            >
              <MessageSquare className="mr-2 h-5 w-5" />
              Get Started - Custom Design
            </Button>
          </div>

          {/* Contact Information Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-20">
            <div className="text-center p-6 bg-card rounded-lg border border-border animate-fade-in">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-primary/10 rounded-full mb-4">
                <Phone className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Phone</h3>
              <a href="tel:+971559779635" className="text-muted-foreground hover:text-primary transition-colors">
                +971 55 977 9635
              </a>
            </div>

            <div className="text-center p-6 bg-card rounded-lg border border-border animate-fade-in">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-primary/10 rounded-full mb-4">
                <Mail className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Email</h3>
              <a href="mailto:info@azizahomes.com" className="text-muted-foreground hover:text-primary transition-colors break-all">
                info@azizahomes.com
              </a>
            </div>

            <div className="text-center p-6 bg-card rounded-lg border border-border animate-fade-in">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-primary/10 rounded-full mb-4">
                <MapPin className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Location</h3>
              <p className="text-muted-foreground">
                Forte Tower 1, Downtown Dubai
              </p>
            </div>

            <div className="text-center p-6 bg-card rounded-lg border border-border animate-fade-in">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-primary/10 rounded-full mb-4">
                <Clock className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Working Hours</h3>
              <p className="text-muted-foreground">
                Monday - Friday<br />
                9:00 AM - 6:00 PM
              </p>
            </div>
          </div>

          {/* Why Contact Us Section */}
          <div className="bg-card rounded-lg border border-border p-8 md:p-12 mb-16 animate-fade-in">
            <h2 className="text-3xl font-light mb-8 text-center">What Happens Next?</h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xl font-semibold mx-auto mb-4">
                  1
                </div>
                <h3 className="text-lg font-semibold mb-2">Share Your Vision</h3>
                <p className="text-muted-foreground">
                  Fill out our comprehensive intake form to tell us about your project, preferences, and budget.
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xl font-semibold mx-auto mb-4">
                  2
                </div>
                <h3 className="text-lg font-semibold mb-2">Personalized Consultation</h3>
                <p className="text-muted-foreground">
                  We'll review your requirements and schedule a consultation to discuss your project in detail.
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xl font-semibold mx-auto mb-4">
                  3
                </div>
                <h3 className="text-lg font-semibold mb-2">Receive Your Proposal</h3>
                <p className="text-muted-foreground">
                  Get a detailed design proposal with mood boards, timeline, and transparent pricing.
                </p>
              </div>
            </div>
          </div>

          {/* WhatsApp Contact Section */}
          <div className="text-center bg-primary/5 rounded-lg p-8 md:p-12 animate-fade-in">
            <h2 className="text-2xl md:text-3xl font-light mb-4">Prefer WhatsApp?</h2>
            <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
              Send us a message on WhatsApp and we will share the intake form link with you. It is the fastest way to get started!
            </p>
            <Button 
              size="lg"
              variant="outline"
              onClick={() => window.open('https://wa.me/971559779635?text=Hi%20Aziza%20Home%2C%20I%20would%20like%20to%20inquire%20about%20your%20custom%20design%20services', '_blank')}
              className="text-lg px-8 py-6"
            >
              <svg className="mr-2 h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              Message on WhatsApp
            </Button>
          </div>
        </div>
      </main>

      <Footer />
      <IntakeFormDialog open={isFormOpen} onOpenChange={setIsFormOpen} />
    </div>
  );
};

export default ContactPage;
