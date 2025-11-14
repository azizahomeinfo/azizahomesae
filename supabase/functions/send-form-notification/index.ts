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

    let notificationSubject = "";
    let notificationHtml = "";
    let clientSubject = "";
    let clientHtml = "";

    switch (formType) {
      case "contact":
        notificationSubject = `New Contact Form Submission from ${data.name}`;
        notificationHtml = `
          <h2>New Contact Form Submission</h2>
          <p><strong>Name:</strong> ${data.name}</p>
          <p><strong>Email:</strong> ${data.email}</p>
          <p><strong>Phone:</strong> ${data.phone || "Not provided"}</p>
          <p><strong>Message:</strong></p>
          <p>${data.message}</p>
          <hr>
          <p><small>Submitted at: ${new Date().toLocaleString()}</small></p>
        `;
        
        clientSubject = "Thank You for Contacting Aziza Home";
        clientHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2c3e50;">Thank You for Reaching Out!</h2>
            <p>Dear ${data.name},</p>
            <p>We have received your message and appreciate you contacting Aziza Home.</p>
            <p><strong>One of our Business Development team members will contact you within 24-48 hours.</strong></p>
            <p>In the meantime, feel free to explore our portfolio and services on our website.</p>
            <p>If you have any urgent questions, you can reach us at:</p>
            <ul style="list-style: none; padding: 0;">
              <li>📧 Email: info@azizahomes.com</li>
              <li>📱 Phone: +971-55-977-9635</li>
              <li>💬 WhatsApp: <a href="https://wa.me/971559779635">Chat with us</a></li>
            </ul>
            <p>Best regards,<br><strong>The Aziza Home Team</strong></p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="font-size: 12px; color: #888;">Aziza Home - Premium Furniture Packages in Dubai</p>
          </div>
        `;
        break;

      case "client_info":
        notificationSubject = `New Client Info Submission - ${data.name}`;
        notificationHtml = `
          <h2>New Client Information Submission</h2>
          <p><strong>Name:</strong> ${data.name}</p>
          <p><strong>Email:</strong> ${data.email}</p>
          <p><strong>Phone:</strong> ${data.phone}</p>
          <p><strong>Purpose:</strong> ${data.purpose}</p>
          <hr>
          <p><small>Submitted at: ${new Date().toLocaleString()}</small></p>
        `;
        
        clientSubject = "Your 2,000 AED Voucher - Aziza Home";
        clientHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2c3e50;">Welcome to Aziza Home! 🎉</h2>
            <p>Dear ${data.name},</p>
            <p>Thank you for your interest in our furniture packages! We're excited to help you furnish your ${data.purpose.replace(/_/g, ' ')}.</p>
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #d4af37;">🎁 Your 2,000 AED Discount Voucher</h3>
              <p>Details of your voucher will be shared with you via WhatsApp shortly.</p>
            </div>
            <p><strong>Our Business Development team will contact you within 24-48 hours</strong> to discuss your requirements and help you choose the perfect package.</p>
            <p>Contact us anytime:</p>
            <ul style="list-style: none; padding: 0;">
              <li>📧 Email: info@azizahomes.com</li>
              <li>📱 Phone: +971-55-977-9635</li>
              <li>💬 WhatsApp: <a href="https://wa.me/971559779635">Chat with us</a></li>
            </ul>
            <p>Best regards,<br><strong>The Aziza Home Team</strong></p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="font-size: 12px; color: #888;">Aziza Home - Premium Furniture Packages in Dubai</p>
          </div>
        `;
        break;

      case "intake":
        notificationSubject = `New Design Project Inquiry from ${data.name}`;
        notificationHtml = `
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
        
        clientSubject = "Your Design Consultation Request - Aziza Home";
        clientHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2c3e50;">Thank You for Your Design Inquiry!</h2>
            <p>Dear ${data.name},</p>
            <p>We're thrilled that you've chosen Aziza Home for your interior design project in ${data.property_location || "Dubai"}.</p>
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0;">📋 Your Project Summary</h3>
              <p><strong>Property Type:</strong> ${data.property_type || "N/A"}</p>
              <p><strong>Budget Range:</strong> ${data.budget_range || "N/A"}</p>
              <p><strong>Preferred Style:</strong> ${data.design_style?.join(", ") || "To be discussed"}</p>
            </div>
            <p><strong>What happens next?</strong></p>
            <p>Our Business Development team will reach out to you within 24-48 hours to:</p>
            <ul>
              <li>✅ Discuss your project in detail</li>
              <li>✅ Schedule a consultation</li>
              <li>✅ Provide a customized proposal</li>
              <li>✅ Answer any questions you may have</li>
            </ul>
            <p>Need immediate assistance?</p>
            <ul style="list-style: none; padding: 0;">
              <li>📧 Email: info@azizahomes.com</li>
              <li>📱 Phone: +971-55-977-9635</li>
              <li>💬 WhatsApp: <a href="https://wa.me/971559779635">Chat with us</a></li>
            </ul>
            <p>We look forward to creating your dream space!</p>
            <p>Best regards,<br><strong>The Aziza Home Design Team</strong></p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="font-size: 12px; color: #888;">Aziza Home - Premium Interior Design & Furniture Packages in Dubai</p>
          </div>
        `;
        break;

      default:
        throw new Error("Invalid form type");
    }

    // Send notification email to business
    const notificationResponse = await resend.emails.send({
      from: "Aziza Home <onboarding@resend.dev>",
      to: [recipientEmail],
      subject: notificationSubject,
      html: notificationHtml,
    });

    console.log("Notification email sent successfully:", notificationResponse);

    // Send auto-reply email to client
    const clientResponse = await resend.emails.send({
      from: "Aziza Home <onboarding@resend.dev>",
      to: [data.email],
      subject: clientSubject,
      html: clientHtml,
    });

    console.log("Client auto-reply sent successfully:", clientResponse);

    return new Response(JSON.stringify({ 
      notification: notificationResponse, 
      clientReply: clientResponse 
    }), {
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
