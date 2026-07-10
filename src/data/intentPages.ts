// ─────────────────────────────────────────────────────────────────────────────
// Service-intent landing pages (top-level routes, e.g. /holiday-home-furnishing-dubai).
// Same rules as locationPages.ts: every entry needs genuinely unique copy.
// When adding a page: add the entry here, register the route in App.tsx is NOT
// needed (the template resolves by path), but add the path to routesToPrerender
// in prerender.js and the route element in App.tsx.
// ─────────────────────────────────────────────────────────────────────────────

import heroHoliday from "@/assets/service-holiday-home-new.webp";
import heroVilla from "@/assets/portfolio-19-2.webp";

export interface IntentPageData {
  /** Full top-level path, e.g. "/holiday-home-furnishing-dubai" */
  path: string;
  title: string;
  metaDescription: string;
  keywords: string;
  heroImage: string;
  heroAlt: string;
  badge: string;
  h1: string;
  subtitle: string;
  intro: string[];
  benefits: { title: string; desc: string }[];
  /** "What's included" checklist */
  included: string[];
  faqs: { q: string; a: string }[];
  /** Location page slugs to cross-link ("Popular areas for...") */
  areaSlugs: string[];
  areasHeading: string;
  /** Show the standard apartment pricing table? */
  showPricing: boolean;
  pricingNote?: string;
  relatedBlog?: { title: string; href: string };
  whatsappMessage: string;
}

export const intentPages: IntentPageData[] = [
  {
    path: "/holiday-home-furnishing-dubai",
    title: "Holiday Home & Airbnb Furnishing in Dubai | Aziza Home",
    metaDescription:
      "Turnkey holiday home and Airbnb furnishing in Dubai. Design, furniture, styling and photo-ready handover for short-term rentals — set up in 5–15 days.",
    keywords:
      "holiday home furnishing dubai, airbnb furnishing dubai, short term rental furnishing dubai, furnish airbnb apartment dubai, holiday home setup dubai, vacation rental furniture package dubai, dtcm holiday home furnishing",
    heroImage: heroHoliday,
    heroAlt: "Styled holiday home apartment in Dubai ready for Airbnb listing",
    badge: "Holiday Home & Airbnb Furnishing",
    h1: "Holiday Home & Airbnb Furnishing in Dubai",
    subtitle:
      "From bare apartment to photo-ready, bookable listing — furniture, styling, and setup built around nightly-rate performance.",
    intro: [
      "On Airbnb and Booking.com, your interior is your storefront. Guests scroll past dozens of Dubai listings in seconds, and the photos decide who stops. That's why holiday-home furnishing is a different discipline from residential furnishing — every choice, from the sofa to the wall art, is made with the listing photo and the guest review in mind.",
      "Dubai's holiday-home market also has practical requirements residential setups don't: durable materials that survive high guest turnover, complete bedroom and linen readiness, appliance packages, and the furnished-and-equipped standard expected for a DTCM holiday home permit. Our packages cover all of it in one project.",
      "We furnish holiday homes across the city's short-stay hotspots — Dubai Marina, JBR, Downtown, Palm Jumeirah, City Walk, Business Bay — and coordinate remotely for overseas owners, from design sign-off to the photo-ready handover your listing photographer walks into.",
    ],
    benefits: [
      {
        title: "Photo-First Styling",
        desc: "Interiors composed for the camera — feature walls, layered textiles, and styling that lifts click-through and nightly rates.",
      },
      {
        title: "Guest-Proof Durability",
        desc: "Commercial-grade fabrics and finishes selected for high turnover, so the apartment still photographs well after 100 stays.",
      },
      {
        title: "Permit-Ready Completeness",
        desc: "Furnished and equipped to the standard DTCM holiday home operation expects — beds, seating, dining, curtains and appliance options.",
      },
    ],
    included: [
      "Design direction matched to your building and target guest",
      "All furniture: bedrooms, living, dining, and balcony where applicable",
      "Curtains, rugs, lighting, and décor styling",
      "Appliance package options (with or without)",
      "Delivery, installation, and building permits handled",
      "Photo-ready handover for your listing shoot",
    ],
    faqs: [
      {
        q: "How fast can my apartment be ready to list?",
        a: "Standard holiday-home setups complete in 5–15 business days after payment and building access. Add a few days for your listing photography and platform approval, and most owners go live within three weeks of starting.",
      },
      {
        q: "Does furnishing quality really change Airbnb income?",
        a: "Yes — on short-stay platforms, interiors influence three revenue levers at once: click-through from search, nightly rate positioning, and review scores. Design-led furnishing is typically the highest-leverage investment a holiday-home owner controls.",
      },
      {
        q: "Do you furnish to the DTCM holiday home standard?",
        a: "Our packages deliver a fully furnished and equipped apartment consistent with what holiday home permits require — complete sleeping, living and dining provision, curtains, and appliance options. Your operator or permit consultant handles the licensing itself.",
      },
      {
        q: "Can you work with my holiday home operator?",
        a: "Yes. We regularly coordinate handovers directly with management companies — they receive a ready unit with photo documentation, and you stay updated remotely throughout.",
      },
      {
        q: "Which areas perform best for holiday homes?",
        a: "Marina, JBR, Downtown, and Palm Jumeirah are Dubai's established short-stay hotspots, with City Walk and Business Bay growing fast. See our area guides below for how furnishing strategy differs in each.",
      },
    ],
    areaSlugs: ["dubai-marina", "jbr", "downtown-dubai", "palm-jumeirah", "city-walk", "business-bay"],
    areasHeading: "Top Holiday-Home Areas We Furnish",
    showPricing: true,
    pricingNote:
      "Holiday-home owners typically choose Premium or Luxury tiers — styling quality shows directly in listing photos and nightly rates. Appliance packages available as an add-on.",
    relatedBlog: {
      title: "How to Maximize Holiday Home ROI in Dubai Marina",
      href: "/blog/maximize-holiday-home-roi-dubai-marina",
    },
    whatsappMessage: "Hi, I would like to furnish my holiday home / Airbnb in Dubai!",
  },
  {
    path: "/villa-furnishing-dubai",
    title: "Villa Furnishing in Dubai | Complete Home Furniture Packages | Aziza Home",
    metaDescription:
      "Complete villa furnishing in Dubai — design, furniture, styling and phased installation for villas and townhouses in Arabian Ranches, Dubai Hills, Palm Jumeirah, Damac Hills and more.",
    keywords:
      "villa furnishing dubai, furnish villa dubai, villa furniture package dubai, townhouse furnishing dubai, full home furnishing dubai, villa interior design dubai, furnish villa before moving dubai",
    heroImage: heroVilla,
    heroAlt: "Fully furnished villa living and dining area in Dubai",
    badge: "Villa Furnishing",
    h1: "Villa Furnishing in Dubai",
    subtitle:
      "Whole-home projects for villas and townhouses — every room designed, delivered, and installed as one coordinated plan.",
    intro: [
      "Furnishing a villa is not a bigger apartment order — it's a different kind of project. A three-to-six-bedroom home involves dozens of coordinated decisions across formal and family living areas, dining, bedrooms, kids' and study rooms, and the outdoor spaces Dubai villa life is built around. Done piecemeal, it takes months of deliveries; done as one planned project, it takes weeks.",
      "That's how we run villa furnishing: a design consultation sets the direction for the whole home, then sourcing, delivery, and installation run as a phased schedule — typically bedrooms and living areas first — so the house comes together in two to four weeks with a single point of coordination.",
      "Most of our villa clients are families: relocating to Dubai and wanting the home ready before they land, upgrading within the city, or preparing a villa for the family-rental market where move-in-ready homes win viewings. We work across Dubai's villa communities, from Arabian Ranches and Dubai Hills to Palm Jumeirah and Damac Hills.",
    ],
    benefits: [
      {
        title: "One Project, Not Fifty Orders",
        desc: "A single design plan and phased installation replaces months of separate purchases and deliveries.",
      },
      {
        title: "Every Room, Inside and Out",
        desc: "Living, dining, all bedrooms, kids' rooms, study, and climate-appropriate garden and terrace furniture.",
      },
      {
        title: "Ready Before You Arrive",
        desc: "Relocating families land to a made home — we complete installation remotely with photo documentation.",
      },
    ],
    included: [
      "Whole-home design consultation and direction",
      "Furniture for all living, dining, and bedroom spaces",
      "Kids' rooms, study, and family storage solutions",
      "Outdoor and garden furniture selected for Dubai's climate",
      "Curtains, rugs, lighting, and full décor styling",
      "Phased delivery and installation with one coordinator",
    ],
    faqs: [
      {
        q: "How much does it cost to furnish a villa in Dubai?",
        a: "Villas are quoted individually after a design consultation, because a 3BR townhouse and a 6BR standalone villa are very different scopes. As a reference, our largest standard apartment package (3-bedroom) starts from AED 52,500; villa projects scale from there by room count and tier.",
      },
      {
        q: "How long does a full villa take to furnish?",
        a: "Townhouses typically complete in one to two weeks; larger villas run two to four weeks as phased installations. We sequence rooms around your move-in date so bedrooms and living areas are ready first.",
      },
      {
        q: "Can you furnish our villa before we move to Dubai?",
        a: "Yes — it's one of our most common requests. Design decisions happen remotely, installation completes while you're abroad, and you receive photo documentation and a ready home on arrival.",
      },
      {
        q: "Do you furnish villas for rental as well as personal homes?",
        a: "Both. Rental villa projects prioritise durable materials and broad-appeal styling that photographs well on the portals; personal homes are tailored more closely to your family's taste and daily routines.",
      },
      {
        q: "Which villa communities do you cover?",
        a: "All of Dubai's main villa districts — Arabian Ranches, Dubai Hills Estate, Damac Hills, Palm Jumeirah, JVC's townhouse districts, and Meydan/MBR City among them. See the community guides below.",
      },
    ],
    areaSlugs: ["arabian-ranches", "dubai-hills-estate", "damac-hills", "palm-jumeirah", "jumeirah-village-circle", "meydan"],
    areasHeading: "Villa Communities We Furnish",
    showPricing: false,
    relatedBlog: {
      title: "Quick, Efficient Ways to Furnish Your Home",
      href: "/blog/quick-efficient-ways-to-furnish-your-home",
    },
    whatsappMessage: "Hi, I would like to furnish my villa in Dubai!",
  },
];

export const getIntentPage = (path: string): IntentPageData | undefined =>
  intentPages.find((p) => p.path === path);
