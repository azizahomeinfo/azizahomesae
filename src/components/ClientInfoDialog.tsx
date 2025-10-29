import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import popupImage from "@/assets/popup-image.jpg";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const formSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  phone: z.string().trim().min(8, "Please enter a valid phone number").max(20),
  email: z.string().trim().email("Please enter a valid email").max(255),
  purpose: z.enum(["new_home", "holiday_home", "rental_tenant"], {
    required_error: "Please select an option",
  }),
});

type FormValues = z.infer<typeof formSchema>;

const ClientInfoDialog = () => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const hasSubmitted = localStorage.getItem("clientInfoSubmitted");
    if (!hasSubmitted) {
      const timer = setTimeout(() => {
        setOpen(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
    },
  });

  const onSubmit = async (data: FormValues) => {
    try {
      const { error } = await supabase
        .from('client_submissions')
        .insert([{
          name: data.name,
          phone: data.phone,
          email: data.email,
          purpose: data.purpose,
        }]);

      if (error) {
        console.error("Error saving submission:", error);
        toast.error("Sorry, there was an error. Please try again.");
        return;
      }

      localStorage.setItem("clientInfoSubmitted", "true");
      toast.success("Your 2,000 AED voucher will be shared with you via WhatsApp!");
      setOpen(false);
    } catch (error) {
      console.error("Error submitting form:", error);
      toast.error("Sorry, there was an error. Please try again.");
    }
  };

  const purposeOptions = [
    { value: "new_home", label: "New Home" },
    { value: "holiday_home", label: "Holiday Home Business" },
    { value: "rental_tenant", label: "Long Term Rental Tenant" },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="grid md:grid-cols-2">
          {/* Image Section */}
          <div className="relative h-48 md:h-full md:min-h-[400px]">
            <img
              src={popupImage}
              alt="Elegant Interior"
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/10" />
            <div className="absolute top-4 md:top-8 left-0 right-0 text-center px-4">
              <div className="inline-block bg-white/90 backdrop-blur-sm px-6 md:px-8 py-3 md:py-4 rounded-sm">
                <p className="text-gray-800 text-lg md:text-2xl font-light tracking-wider leading-relaxed" style={{ fontFamily: 'serif' }}>
                  2,000 AED discount voucher
                  <br />
                  <span className="text-sm md:text-lg">for all packages</span>
                </p>
              </div>
            </div>
          </div>

          {/* Form Section */}
          <div className="p-6">
            <DialogHeader className="text-left mb-4">
              <DialogTitle className="text-xl">Get 2,000 AED Discount!</DialogTitle>
              <DialogDescription className="text-sm">
                Share your furnishing needs for an exclusive discount.
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="purpose"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-sm">I'm furnishing for:</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="space-y-2"
                        >
                          {purposeOptions.map((option) => (
                            <div key={option.value} className="flex items-center space-x-2">
                              <RadioGroupItem value={option.value} id={option.value} />
                              <Label
                                htmlFor={option.value}
                                className="font-normal cursor-pointer text-sm"
                              >
                                {option.label}
                              </Label>
                            </div>
                          ))}
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Your full name" {...field} className="h-9" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="+971 50 123 4567" {...field} className="h-9" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="your.email@example.com" {...field} className="h-9" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full">
                  Submit & Get 2,000 AED Discount
                </Button>
              </form>
            </Form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ClientInfoDialog;
