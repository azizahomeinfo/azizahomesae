import { Mail, Phone, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase-ssr";
import { useState } from "react";
import { z } from "zod";

const contactSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  email: z.string().trim().email("Invalid email address").max(255, "Email must be less than 255 characters"),
  phone: z.string().trim().max(20, "Phone must be less than 20 characters").optional(),
  message: z.string().trim().min(1, "Message is required").max(2000, "Message must be less than 2000 characters"),
});

const Contact = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const formData = new FormData(e.currentTarget);
      const data = {
        name: formData.get("name") as string,
        email: formData.get("email") as string,
        phone: formData.get("phone") as string,
        message: formData.get("message") as string,
      };

      // Validate input
      const validated = contactSchema.parse(data);

      // Get current user (if logged in)
      const { data: { user } } = await supabase.auth.getUser();

      // Insert into database
      const { error } = await supabase
        .from("contact_messages")
        .insert({
          user_id: user?.id || null,
          name: validated.name,
          email: validated.email,
          phone: validated.phone || null,
          message: validated.message,
        });

      if (error) throw error;

      // Send email notification
      try {
        await supabase.functions.invoke('send-form-notification', {
          body: {
            formType: 'contact',
            data: validated,
            recipientEmail: 'info@azizahomes.com'
          }
        });
      } catch (emailError) {
        console.error("Error sending email notification:", emailError);
        // Don't fail the submission if email fails
      }

      toast.success("Thank you for your message! We'll get back to you soon.");
      e.currentTarget.reset();
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        console.error("Error submitting contact form:", error);
        toast.error("Failed to send message. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="contact" className="py-20 md:py-32 bg-secondary/30">
      <div className="container mx-auto px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-heading font-semibold text-foreground mb-4 uppercase tracking-wide">
              Get In Touch
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Ready to transform your space? Let's discuss your vision and create something beautiful together.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {/* Contact Information */}
            <div className="space-y-8">
              <div>
                <h3 className="text-2xl font-heading font-semibold text-foreground mb-6">
                  Contact Information
                </h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <Mail className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                    <div>
                      <div className="font-medium text-foreground">Email</div>
                      <a href="mailto:info@azizahomes.com" className="text-muted-foreground hover:text-primary transition-smooth">
                        info@azizahomes.com
                      </a>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <Phone className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                    <div>
                      <div className="font-medium text-foreground">Phone</div>
                      <a href="tel:+971559779635" className="text-muted-foreground hover:text-primary transition-smooth">
                        +971 55 977 9635
                      </a>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <MapPin className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                    <div>
                      <div className="font-medium text-foreground">Location</div>
                      <div className="text-muted-foreground">
                        Forte Tower 1, Downtown Dubai, UAE
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-primary/5 p-6 rounded-lg">
                <h4 className="font-medium text-foreground mb-2">Business Hours</h4>
                <div className="text-muted-foreground space-y-1 text-sm">
                  <div>Monday - Friday: 9:00 AM - 6:00 PM</div>
                  <div>Saturday - Sunday: Closed</div>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Input 
                    type="text" 
                    name="name"
                    placeholder="Your Name" 
                    required 
                    maxLength={100}
                    className="w-full" 
                  />
                </div>
                <div>
                  <Input 
                    type="email" 
                    name="email"
                    placeholder="Your Email" 
                    required 
                    maxLength={255}
                    className="w-full" 
                  />
                </div>
                <div>
                  <Input 
                    type="tel" 
                    name="phone"
                    placeholder="Phone Number" 
                    maxLength={20}
                    className="w-full" 
                  />
                </div>
                <div>
                  <Textarea 
                    name="message"
                    placeholder="Tell us about your project..." 
                    required 
                    maxLength={2000}
                    className="w-full min-h-[150px]" 
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full bg-primary hover:bg-primary/90"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Sending..." : "Send Message"}
                </Button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Contact;