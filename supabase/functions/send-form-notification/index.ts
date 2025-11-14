import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface FormNotificationRequest {
  formType: "contact" | "client_info" | "intake";
  data: Record<string, any>;
  recipientEmail: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { formType, data, recipientEmail }: FormNotificationRequest = await req.json();

    console.log(`Processing ${formType} form notification`);

    let emailSubject = "";
    let emailHtml = "";

    switch (formType) {
      case "contact":
        emailSubject = `New Contact Form Submission from ${data.name}`;
        emailHtml = `
          <h2>New Contact Form Submission</h2>
          <p><strong>Name:</strong> ${data.name}</p>
          <p><strong>Email:</strong> ${data.email}</p>
          <p><strong>Phone:</strong> ${data.phone || "Not provided"}</p>
          <p><strong>Message:</strong></p>
          <p>${data.message}</p>
          <hr>
          <p><small>Submitted at: ${new Date().toLocaleString()}</small></p>
        `;
        break;

      case "client_info":
        emailSubject = `New Client Info Submission - ${data.name}`;
        emailHtml = `
          <h2>New Client Information Submission</h2>
          <p><strong>Name:</strong> ${data.name}</p>
          <p><strong>Email:</strong> ${data.email}</p>
          <p><strong>Phone:</strong> ${data.phone}</p>
          <p><strong>Purpose:</strong> ${data.purpose}</p>
          <hr>
          <p><small>Submitted at: ${new Date().toLocaleString()}</small></p>
        `;
        break;

      case "intake":
        emailSubject = `New Design Project Inquiry from ${data.name}`;
        emailHtml = `
          <h2>New Design Project Inquiry</h2>
          <h3>Contact Information</h3>
          <p><strong>Name:</strong> ${data.name}</p>
          <p><strong>Email:</strong> ${data.email}</p>
          <p><strong>Phone:</strong> ${data.phone}</p>
          
          <h3>Client Details</h3>
          <p><strong>Nationality:</strong> ${data.nationality || "Not provided"}</p>
          <p><strong>Residency:</strong> ${data.residency || "Not provided"}</p>
          
          <h3>Project Details</h3>
          <p><strong>Property Location:</strong> ${data.property_location}</p>
          <p><strong>Property Type:</strong> ${data.property_type}</p>
          <p><strong>Spaces to Furnish:</strong> ${data.spaces_to_furnish?.join(", ") || "Not specified"}</p>
          ${data.spaces_other ? `<p><strong>Other Spaces:</strong> ${data.spaces_other}</p>` : ""}
          <p><strong>Budget Range:</strong> ${data.budget_range || "Not provided"}</p>
          <p><strong>Move-in Date:</strong> ${data.move_in_date || "Not provided"}</p>
          
          <h3>Design Preferences</h3>
          <p><strong>Design Style:</strong> ${data.design_style?.join(", ") || "Not specified"}</p>
          ${data.style_other ? `<p><strong>Other Style:</strong> ${data.style_other}</p>` : ""}
          <p><strong>Color Palette:</strong> ${data.color_palette?.join(", ") || "Not specified"}</p>
          ${data.color_other ? `<p><strong>Other Colors:</strong> ${data.color_other}</p>` : ""}
          
          <h3>Additional Information</h3>
          <p>${data.additional_info || "None provided"}</p>
          
          <hr>
          <p><small>Submitted at: ${new Date().toLocaleString()}</small></p>
        `;
        break;

      default:
        throw new Error("Invalid form type");
    }

    const emailResponse = await resend.emails.send({
      from: "Aziza Home <onboarding@resend.dev>",
      to: [recipientEmail],
      subject: emailSubject,
      html: emailHtml,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-form-notification function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
