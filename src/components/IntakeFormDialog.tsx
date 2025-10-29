import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";

const intakeFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Invalid email").max(255),
  phone: z.string().max(20).optional(),
  client_type: z.string().min(1, "Please select client type"),
  property_type: z.string().optional(),
  property_size: z.string().optional(),
  budget_range: z.string().min(1, "Please select budget range"),
  timeline: z.string().min(1, "Please select timeline"),
  special_requirements: z.string().max(2000).optional(),
  inspiration_links: z.string().max(500).optional(),
});

interface IntakeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const IntakeFormDialog = ({ open, onOpenChange }: IntakeFormDialogProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [designStyles, setDesignStyles] = useState<string[]>([]);
  const [colorPalettes, setColorPalettes] = useState<string[]>([]);
  const [spacesToDesign, setSpacesToDesign] = useState<string[]>([]);
  const [clientType, setClientType] = useState("");
  const [otherClientType, setOtherClientType] = useState("");
  const [otherDesignStyle, setOtherDesignStyle] = useState("");
  const [otherColorPalette, setOtherColorPalette] = useState("");
  const [otherSpace, setOtherSpace] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const formData = new FormData(e.currentTarget);
      const finalClientType = clientType === "other" ? otherClientType : clientType;
      const finalDesignStyles = [...designStyles];
      if (otherDesignStyle.trim()) {
        finalDesignStyles.push(otherDesignStyle.trim());
      }
      const finalColorPalettes = [...colorPalettes];
      if (otherColorPalette.trim()) {
        finalColorPalettes.push(otherColorPalette.trim());
      }
      const finalSpaces = [...spacesToDesign];
      if (otherSpace.trim()) {
        finalSpaces.push(otherSpace.trim());
      }

      const data = {
        name: formData.get("name") as string,
        email: formData.get("email") as string,
        phone: formData.get("phone") as string,
        client_type: finalClientType,
        property_type: formData.get("property_type") as string,
        property_size: formData.get("property_size") as string,
        budget_range: formData.get("budget_range") as string,
        timeline: formData.get("timeline") as string,
        special_requirements: formData.get("special_requirements") as string,
        inspiration_links: "",
      };

      // Validate
      const validated = intakeFormSchema.parse(data);

      // Get current user (if logged in)
      const { data: { user } } = await supabase.auth.getUser();

      // Insert into database
      const { error } = await supabase.from("intake_forms").insert({
        user_id: user?.id || null,
        name: validated.name,
        email: validated.email,
        phone: validated.phone || null,
        client_type: validated.client_type,
        property_type: validated.property_type || null,
        property_size: validated.property_size || null,
        budget_range: validated.budget_range,
        timeline: validated.timeline,
        design_style: finalDesignStyles.length > 0 ? finalDesignStyles : null,
        color_palette: finalColorPalettes.length > 0 ? finalColorPalettes : null,
        spaces_to_design: finalSpaces.length > 0 ? finalSpaces : null,
        special_requirements: validated.special_requirements || null,
        inspiration_links: null,
      });

      if (error) throw error;

      toast.success("Thank you! We'll be in touch soon.", {
        description: "Your inquiry has been submitted successfully.",
      });

      setIsSubmitted(true);
      e.currentTarget.reset();
      setDesignStyles([]);
      setColorPalettes([]);
      setSpacesToDesign([]);
      setClientType("");
      setOtherClientType("");
      setOtherDesignStyle("");
      setOtherColorPalette("");
      setOtherSpace("");
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        console.error("Error submitting form:", error);
        toast.error("Failed to submit form. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleArrayValue = (value: string, array: string[], setter: (arr: string[]) => void) => {
    if (array.includes(value)) {
      setter(array.filter(item => item !== value));
    } else {
      setter([...array, value]);
    }
  };

  const handleWhatsAppClick = () => {
    const message = encodeURIComponent("Hi! I just submitted an inquiry form on your website. I would like to discuss my design project further.");
    window.open(`https://wa.me/971559779635?text=${message}`, "_blank");
    onOpenChange(false);
    setIsSubmitted(false);
  };

  const handleClose = () => {
    onOpenChange(false);
    setIsSubmitted(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {isSubmitted ? "Thank You!" : "Start Your Design Journey"}
          </DialogTitle>
          <DialogDescription>
            {isSubmitted 
              ? "Your inquiry has been submitted successfully. We'll review your details and get back to you soon."
              : "Tell us about your project and we'll create a personalized design plan for you."}
          </DialogDescription>
        </DialogHeader>

        {isSubmitted ? (
          <div className="space-y-6 py-8 text-center">
            <p className="text-lg">
              Want to discuss your project right away?
            </p>
            <Button 
              onClick={handleWhatsAppClick}
              size="lg"
              className="w-full md:w-auto"
            >
              Continue on WhatsApp
            </Button>
            <p className="text-sm text-muted-foreground mt-4">
              Or we'll reach out to you within 24 hours
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
          {/* Contact Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Contact Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Full Name *</Label>
                <Input id="name" name="name" required maxLength={100} />
              </div>
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input id="email" name="email" type="email" required maxLength={255} />
              </div>
            </div>
            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input id="phone" name="phone" type="tel" maxLength={20} />
            </div>
          </div>

          {/* Client Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">About You</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="client_type">I am a *</Label>
                <Select name="client_type" required value={clientType} onValueChange={setClientType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select client type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="end_user">End User (Homeowner)</SelectItem>
                    <SelectItem value="holiday_home">Holiday Home Operator</SelectItem>
                    <SelectItem value="investor">Investor/Property Developer</SelectItem>
                    <SelectItem value="expat">Expat Relocating to Dubai</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="property_type">Property Type</Label>
                <Select name="property_type">
                  <SelectTrigger>
                    <SelectValue placeholder="Select property type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="apartment">Apartment</SelectItem>
                    <SelectItem value="villa">Villa</SelectItem>
                    <SelectItem value="penthouse">Penthouse</SelectItem>
                    <SelectItem value="townhouse">Townhouse</SelectItem>
                    <SelectItem value="commercial">Commercial Space</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {clientType === "other" && (
              <div>
                <Label htmlFor="other_client_type">Please Specify *</Label>
                <Input 
                  id="other_client_type" 
                  value={otherClientType}
                  onChange={(e) => setOtherClientType(e.target.value)}
                  placeholder="Specify your client type"
                  required
                  maxLength={100}
                />
              </div>
            )}
            <div>
              <Label htmlFor="property_size">Property Size</Label>
              <Select name="property_size">
                <SelectTrigger>
                  <SelectValue placeholder="Select size" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="studio">Studio</SelectItem>
                  <SelectItem value="one_bed">1 Bedroom</SelectItem>
                  <SelectItem value="two_bed">2 Bedrooms</SelectItem>
                  <SelectItem value="three_bed_plus">3+ Bedrooms</SelectItem>
                  <SelectItem value="large_space">Large Space (4+ rooms)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Project Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Project Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="budget_range">Budget Range *</Label>
                <Select name="budget_range" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select budget" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="50k_100k">AED 50,000 - 100,000</SelectItem>
                    <SelectItem value="100k_200k">AED 100,000 - 200,000</SelectItem>
                    <SelectItem value="200k_plus">AED 200,000+</SelectItem>
                    <SelectItem value="flexible">Flexible</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="timeline">Timeline *</Label>
                <Select name="timeline" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select timeline" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="urgent">Urgent (Within 1 month)</SelectItem>
                    <SelectItem value="1_3_months">1-3 Months</SelectItem>
                    <SelectItem value="3_6_months">3-6 Months</SelectItem>
                    <SelectItem value="flexible">Flexible</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Design Preferences */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Design Preferences</h3>
            <div>
              <Label>Preferred Design Styles (Select all that apply)</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
                {[
                  { value: "japandi", label: "Japandi" },
                  { value: "wabi_sabi", label: "Wabi-Sabi" },
                  { value: "minimalist", label: "Minimalist" },
                  { value: "scandinavian", label: "Scandinavian" },
                  { value: "modern", label: "Modern" },
                  { value: "traditional", label: "Traditional" },
                  { value: "other", label: "Other" },
                ].map((style) => (
                  <div key={style.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={style.value}
                      checked={designStyles.includes(style.value)}
                      onCheckedChange={() => toggleArrayValue(style.value, designStyles, setDesignStyles)}
                    />
                    <Label htmlFor={style.value} className="font-normal cursor-pointer">
                      {style.label}
                    </Label>
                  </div>
                ))}
              </div>
              {designStyles.includes("other") && (
                <div className="mt-3">
                  <Label htmlFor="other_design_style">Specify Other Design Style</Label>
                  <Input 
                    id="other_design_style" 
                    value={otherDesignStyle}
                    onChange={(e) => setOtherDesignStyle(e.target.value)}
                    placeholder="Enter your preferred design style"
                    maxLength={100}
                  />
                </div>
              )}
            </div>

            <div>
              <Label>Color Palette (Select all that apply)</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
                {[
                  { value: "neutral", label: "Neutral Tones" },
                  { value: "warm", label: "Warm Colors" },
                  { value: "cool", label: "Cool Colors" },
                  { value: "earth_tones", label: "Earth Tones" },
                  { value: "monochrome", label: "Monochrome" },
                  { value: "bold_accents", label: "Bold Accents" },
                  { value: "other", label: "Other" },
                ].map((palette) => (
                  <div key={palette.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={palette.value}
                      checked={colorPalettes.includes(palette.value)}
                      onCheckedChange={() => toggleArrayValue(palette.value, colorPalettes, setColorPalettes)}
                    />
                    <Label htmlFor={palette.value} className="font-normal cursor-pointer">
                      {palette.label}
                    </Label>
                  </div>
                ))}
              </div>
              {colorPalettes.includes("other") && (
                <div className="mt-3">
                  <Label htmlFor="other_color_palette">Specify Other Color Palette</Label>
                  <Input 
                    id="other_color_palette" 
                    value={otherColorPalette}
                    onChange={(e) => setOtherColorPalette(e.target.value)}
                    placeholder="Enter your preferred color palette"
                    maxLength={100}
                  />
                </div>
              )}
            </div>

            <div>
              <Label>Spaces to Design (Select all that apply)</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
                {[
                  { value: "entire_home", label: "Entire Home" },
                  { value: "living_room", label: "Living Room" },
                  { value: "bedroom", label: "Bedroom" },
                  { value: "kitchen", label: "Kitchen" },
                  { value: "bathroom", label: "Bathroom" },
                  { value: "dining", label: "Dining Area" },
                  { value: "office", label: "Home Office" },
                  { value: "other", label: "Other" },
                ].map((space) => (
                  <div key={space.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={space.value}
                      checked={spacesToDesign.includes(space.value)}
                      onCheckedChange={() => toggleArrayValue(space.value, spacesToDesign, setSpacesToDesign)}
                    />
                    <Label htmlFor={space.value} className="font-normal cursor-pointer">
                      {space.label}
                    </Label>
                  </div>
                ))}
              </div>
              {spacesToDesign.includes("other") && (
                <div className="mt-3">
                  <Label htmlFor="other_space">Specify Other Space</Label>
                  <Input 
                    id="other_space" 
                    value={otherSpace}
                    onChange={(e) => setOtherSpace(e.target.value)}
                    placeholder="Enter the space you want to design"
                    maxLength={100}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Additional Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Additional Information</h3>
            <div>
              <Label htmlFor="special_requirements">Special Requirements or Preferences</Label>
              <Textarea
                id="special_requirements"
                name="special_requirements"
                placeholder="Tell us about any specific requirements, accessibility needs, pet considerations, etc."
                maxLength={2000}
                rows={4}
              />
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              {isSubmitting ? "Submitting..." : "Submit Inquiry"}
            </Button>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </Button>
          </div>
        </form>
        )}
      </DialogContent>
    </Dialog>
  );
};
