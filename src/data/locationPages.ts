// ─────────────────────────────────────────────────────────────────────────────
// Location × intent landing pages ("/furnishing/<area-slug>").
// Each entry MUST have genuinely unique copy — intro, rental context, FAQs —
// so pages read as real local guides, not doorway pages. When adding a new
// area: add the entry here, then add the route to routesToPrerender in
// prerender.js so it is prerendered and included in the sitemap.
// ─────────────────────────────────────────────────────────────────────────────

import heroMarina from "@/assets/portfolio-12.webp";
import heroDowntown from "@/assets/portfolio-1.webp";
import heroBusinessBay from "@/assets/portfolio-10.webp";
import heroJvc from "@/assets/portfolio-2.webp";
import heroPalm from "@/assets/portfolio-15.webp";
import heroHills from "@/assets/portfolio-18.webp";
import heroCityWalk from "@/assets/portfolio-16.webp";

export interface LocationFaq {
  q: string;
  a: string;
}

export interface LocationPageData {
  slug: string;
  areaName: string;
  title: string;
  metaDescription: string;
  keywords: string;
  heroImage: string;
  heroAlt: string;
  badge: string;
  h1: string;
  subtitle: string;
  /** 2–3 unique paragraphs about furnishing in this specific area */
  intro: string[];
  /** Area-specific reasons to furnish, shown as 3 cards */
  whyFurnish: { title: string; desc: string }[];
  /** Well-known towers/communities — local relevance signals */
  popularBuildings: string[];
  faqs: LocationFaq[];
  /** Slugs of related location pages for internal linking */
  nearby: string[];
  /** Optional related blog post for deeper interlinking */
  relatedBlog?: { title: string; href: string };
}

export const locationPages: LocationPageData[] = [
  {
    slug: "dubai-marina",
    areaName: "Dubai Marina",
    title: "Apartment Furnishing in Dubai Marina | Furniture Packages | Aziza Home",
    metaDescription:
      "Turnkey furniture packages for Dubai Marina apartments. Holiday-home and rental-ready furnishing with design, delivery, installation and styling in 5–15 days.",
    keywords:
      "dubai marina furnishing, furniture package dubai marina, furnish apartment dubai marina, holiday home furnishing dubai marina, airbnb furnishing dubai marina, rental furnishing marina",
    heroImage: heroMarina,
    heroAlt: "Furnished apartment in Dubai Marina with modern Japandi interior",
    badge: "Dubai Marina Furnishing",
    h1: "Apartment Furnishing in Dubai Marina",
    subtitle:
      "Turnkey furniture packages for Marina apartments — designed for holiday homes, short-term rentals, and premium long-term leases.",
    intro: [
      "Dubai Marina is one of the busiest short-term rental markets in the city. Guests booking a Marina stay expect a waterfront lifestyle — which means listings compete heavily on photos, styling, and first impressions. An empty or generically furnished unit gets scrolled past; a professionally styled one gets booked.",
      "Most Marina units are studios, 1BR and 2BR apartments in high-rise towers, and many owners live overseas. We handle the entire setup remotely: design direction, sourcing, tower delivery bookings, installation, and styling — so your apartment goes from bare to listing-ready without you flying in.",
      "Because Marina buildings have strict move-in and service-elevator rules, our team coordinates directly with building management for delivery permits and installation slots — one of the most common friction points for owners furnishing on their own.",
    ],
    whyFurnish: [
      {
        title: "Short-Term Rental Hotspot",
        desc: "Marina is a top Airbnb performing area in Dubai. Styled interiors directly influence nightly rate and occupancy.",
      },
      {
        title: "Overseas-Owner Friendly",
        desc: "Full remote coordination — many of our Marina clients never visit during the setup.",
      },
      {
        title: "Tower Logistics Handled",
        desc: "We manage building permits, service-elevator bookings, and installation scheduling with Marina tower management.",
      },
    ],
    popularBuildings: [
      "Marina Gate",
      "Princess Tower",
      "Cayan Tower",
      "Emaar Six Towers",
      "Marina Promenade",
      "Damac Heights",
    ],
    faqs: [
      {
        q: "How long does it take to furnish a Dubai Marina apartment?",
        a: "Standard setups take 5–15 business days after payment and building access. Marina towers require delivery permits and service-elevator bookings, which we arrange with building management as part of the service.",
      },
      {
        q: "Do you furnish Marina apartments for Airbnb / holiday homes?",
        a: "Yes — holiday-home setups are one of our most requested services in Dubai Marina. Packages can include appliance options, linen-ready bedrooms, and styling aimed at listing photography.",
      },
      {
        q: "Can you furnish my Marina apartment while I'm overseas?",
        a: "Yes. We coordinate everything remotely — design direction, updates, delivery, installation, and handover photos — so overseas owners can list without traveling to Dubai.",
      },
      {
        q: "Which package do Marina holiday-home owners usually choose?",
        a: "Most Marina holiday-home owners choose Premium or Luxury, because stronger styling and feature walls noticeably improve listing photos and nightly-rate positioning in a competitive area.",
      },
    ],
    nearby: ["palm-jumeirah", "jumeirah-village-circle", "business-bay"],
    relatedBlog: {
      title: "How to Maximize Holiday Home ROI in Dubai Marina",
      href: "/blog/maximize-holiday-home-roi-dubai-marina",
    },
  },
  {
    slug: "downtown-dubai",
    areaName: "Downtown Dubai",
    title: "Apartment Furnishing in Downtown Dubai | Furniture Packages | Aziza Home",
    metaDescription:
      "Premium furniture packages for Downtown Dubai apartments near Burj Khalifa & Dubai Mall. Turnkey furnishing for rentals and holiday homes in 5–15 days.",
    keywords:
      "downtown dubai furnishing, furniture package downtown dubai, furnish apartment downtown dubai, burj khalifa apartment furnishing, holiday home furnishing downtown, rental furnishing downtown dubai",
    heroImage: heroDowntown,
    heroAlt: "Furnished premium apartment in Downtown Dubai",
    badge: "Downtown Dubai Furnishing",
    h1: "Apartment Furnishing in Downtown Dubai",
    subtitle:
      "Design-led furniture packages for Downtown apartments — built for the city's most premium rental audience.",
    intro: [
      "Downtown Dubai sets the ceiling for rental pricing in the city. Tenants and holiday-home guests paying Downtown rates expect interiors that match the address — Burj Khalifa views deserve better than flat-pack basics. Presentation here isn't a nice-to-have; it's what justifies the premium.",
      "The Downtown tenant profile skews toward executives, professional couples, and high-spend tourists. Our packages for Downtown units lean on the Premium and Luxury tiers: feature walls, richer textiles, and styling calibrated for the level of finish these buildings already deliver in their lobbies and amenities.",
      "We regularly furnish units across the Opera District, Boulevard, and Old Town, and handle the strict delivery and installation protocols of Emaar-managed towers on your behalf.",
    ],
    whyFurnish: [
      {
        title: "Premium Rate Justification",
        desc: "Downtown rents are the city's highest — interiors that match the address protect and support that pricing.",
      },
      {
        title: "Executive Tenant Profile",
        desc: "Corporate tenants and executives expect move-in-ready, hotel-grade presentation.",
      },
      {
        title: "Emaar Tower Protocols",
        desc: "We handle the delivery permits, insurance requirements, and installation rules of Downtown's managed towers.",
      },
    ],
    popularBuildings: [
      "Burj Khalifa",
      "The Address Residences",
      "Burj Vista",
      "Boulevard Central",
      "South Ridge",
      "Opera Grand",
    ],
    faqs: [
      {
        q: "What does it cost to furnish a Downtown Dubai apartment?",
        a: "Packages start from AED 22,500 for a studio and from AED 30,000 for a 1BR (Essential tier). Most Downtown owners choose Premium or Luxury tiers to match the building standard — a full quotation depends on layout and scope.",
      },
      {
        q: "Do you furnish apartments in Burj Khalifa and Address buildings?",
        a: "Yes. We work within the delivery, insurance, and installation protocols of Emaar-managed and branded-residence towers, and coordinate permits directly with building management.",
      },
      {
        q: "Is furnishing worth it for a Downtown long-term rental?",
        a: "In Downtown, furnished units target the executive and corporate segment, which pays a premium for move-in-ready homes. Based on selected previous projects, professional furnishing may support around 15–20% stronger rental positioning depending on the unit and market conditions.",
      },
      {
        q: "How fast can a Downtown unit be rental-ready?",
        a: "Typically 5–15 business days from confirmation and access. Fast-track options may be available depending on stock and tower access rules.",
      },
    ],
    nearby: ["business-bay", "city-walk", "dubai-marina"],
    relatedBlog: {
      title: "How to Maximize Rental ROI in Downtown Dubai",
      href: "/blog/maximize-rental-roi-downtown-dubai",
    },
  },
  {
    slug: "business-bay",
    areaName: "Business Bay",
    title: "Apartment Furnishing in Business Bay | Furniture Packages | Aziza Home",
    metaDescription:
      "Turnkey furniture packages for Business Bay apartments. Stand out in Dubai's highest-supply rental market with professional furnishing in 5–15 days.",
    keywords:
      "business bay furnishing, furniture package business bay, furnish apartment business bay, rental furnishing business bay, airbnb furnishing business bay, canal view apartment furnishing",
    heroImage: heroBusinessBay,
    heroAlt: "Furnished modern apartment in Business Bay, Dubai",
    badge: "Business Bay Furnishing",
    h1: "Apartment Furnishing in Business Bay",
    subtitle:
      "In Dubai's highest-supply rental district, presentation is what separates your listing from a thousand identical ones.",
    intro: [
      "Business Bay has one of the largest inventories of studios and 1-bedroom apartments in Dubai — which means fierce competition among nearly identical listings. When a tenant compares ten canal-view 1BRs at similar prices, the professionally furnished one wins the viewing and the lease.",
      "The Bay's tenant base is dominated by young professionals working in DIFC, Downtown, and the Bay itself, plus a fast-growing short-stay market spilling over from Downtown at friendlier nightly rates. Both audiences decide from photos first.",
      "Our Business Bay setups focus on maximizing compact layouts: space-efficient furniture, smart storage, and styling that makes a 450 sq ft studio photograph like a boutique hotel room rather than a box.",
    ],
    whyFurnish: [
      {
        title: "Cut Through High Supply",
        desc: "Business Bay's massive studio/1BR inventory means unfurnished units compete on price alone. Styling breaks the tie.",
      },
      {
        title: "Compact-Layout Expertise",
        desc: "Furniture scaled and styled for studios and 1BRs — small units that photograph large.",
      },
      {
        title: "Downtown Spillover Demand",
        desc: "Short-stay guests priced out of Downtown book the Bay — styled units capture that premium demand.",
      },
    ],
    popularBuildings: [
      "Executive Towers",
      "DAMAC Towers by Paramount",
      "Peninsula",
      "Aykon City",
      "Bay Square",
      "The Sterling",
    ],
    faqs: [
      {
        q: "Is it worth furnishing a studio in Business Bay?",
        a: "Yes — studios are where furnishing changes perception the most. In the Bay's crowded studio market, a styled unit stands out in listings, attracts faster tenant interest, and can support stronger pricing than empty comparable units.",
      },
      {
        q: "What does furnishing a Business Bay 1BR cost?",
        a: "1-bedroom packages start from AED 30,000 (Essential), AED 36,500 (Premium) and AED 46,000 (Luxury), excluding appliances and VAT. Premium is the most common choice for Bay rentals.",
      },
      {
        q: "Can you furnish for both long-term rental and Airbnb?",
        a: "Yes. We'll recommend the tier and appliance options based on your strategy — long-term lets usually take Essential/Premium, while short-stay units benefit from Premium/Luxury styling for listing photos.",
      },
      {
        q: "How quickly can my Business Bay unit be ready?",
        a: "Standard timelines are 5–15 business days after confirmation and building access. Bay towers generally have straightforward delivery procedures, which we handle end to end.",
      },
    ],
    nearby: ["downtown-dubai", "dubai-marina", "jumeirah-village-circle"],
    relatedBlog: {
      title: "Where to Invest in Dubai: Best ROI & Property Growth",
      href: "/blog/where-to-invest-dubai-best-roi-property-growth",
    },
  },
  {
    slug: "jumeirah-village-circle",
    areaName: "Jumeirah Village Circle (JVC)",
    title: "Apartment Furnishing in JVC | Furniture Packages | Aziza Home",
    metaDescription:
      "Furniture packages for JVC apartments and townhouses. Family-friendly, high-yield rental furnishing in Jumeirah Village Circle — ready in 5–15 days.",
    keywords:
      "jvc furnishing, furniture package jvc, furnish apartment jvc, jumeirah village circle furnishing, family rental furnishing jvc, high yield rental furnishing dubai",
    heroImage: heroJvc,
    heroAlt: "Furnished family apartment in Jumeirah Village Circle, Dubai",
    badge: "JVC Furnishing",
    h1: "Apartment & Townhouse Furnishing in JVC",
    subtitle:
      "Practical, durable, family-ready furnishing for Dubai's favourite high-yield community.",
    intro: [
      "Jumeirah Village Circle consistently ranks among Dubai's highest rental-yield areas, which is exactly why investors flock to it — and why the rental market there is getting more competitive every year. As new towers hand over, well-presented units lease faster and hold their rates better.",
      "JVC's tenant profile is different from Marina or Downtown: young families and budget-conscious professionals looking for space and value. Our JVC packages prioritise durable materials, family-practical layouts, and warm styling over showpiece minimalism — interiors designed for people who will actually live in them long-term.",
      "We furnish JVC apartments and townhouses alike, and the community's newer buildings make for smooth delivery logistics — most setups here run at the faster end of our 5–15 day window.",
    ],
    whyFurnish: [
      {
        title: "Win the Yield Game",
        desc: "JVC is a yield-driven market. Furnished, move-in-ready units rent faster and reduce costly vacant months.",
      },
      {
        title: "Family-Ready Styling",
        desc: "Durable, practical, warm interiors matched to JVC's family and long-stay tenant base.",
      },
      {
        title: "Townhouses Too",
        desc: "Full multi-floor townhouse furnishing — living, bedrooms, dining, and outdoor areas.",
      },
    ],
    popularBuildings: [
      "Bloom Towers",
      "Belgravia",
      "FIVE Jumeirah Village",
      "Binghatti Crest",
      "Oxford Residence",
      "JVC townhouse districts 10–16",
    ],
    faqs: [
      {
        q: "Is furnishing worth it in a value-focused area like JVC?",
        a: "Yes — precisely because JVC competes on value, a furnished unit stands out. Move-in-ready homes appeal strongly to families relocating within Dubai and reduce vacancy between tenancies, which matters more for yield than headline rent.",
      },
      {
        q: "Do you furnish JVC townhouses as well as apartments?",
        a: "Yes. We regularly furnish multi-floor JVC townhouses, including living and dining areas, all bedrooms, and practical family storage. Townhouse quotations are scoped individually.",
      },
      {
        q: "What package tier fits a JVC long-term rental?",
        a: "Essential and Premium are the most common tiers in JVC. Essential delivers a clean, rental-ready result; Premium adds styling and a feature wall that noticeably lifts listing photos for a modest increment.",
      },
      {
        q: "How long does a JVC setup take?",
        a: "Most JVC apartments complete in 5–12 business days — the community's newer buildings and easier access typically put it at the faster end of our standard window.",
      },
    ],
    nearby: ["dubai-marina", "business-bay", "dubai-hills-estate"],
    relatedBlog: {
      title: "JVC Family Rental Furnishing: ROI Guide",
      href: "/blog/jvc-family-rental-furnishing-roi-guide",
    },
  },
  {
    slug: "palm-jumeirah",
    areaName: "Palm Jumeirah",
    title: "Apartment & Villa Furnishing on Palm Jumeirah | Aziza Home",
    metaDescription:
      "Luxury furnishing packages for Palm Jumeirah apartments and villas. Design-led holiday-home and residence furnishing on Dubai's most exclusive island.",
    keywords:
      "palm jumeirah furnishing, furnish villa palm jumeirah, furniture package palm jumeirah, luxury holiday home furnishing dubai, shoreline apartment furnishing, palm jumeirah interior design",
    heroImage: heroPalm,
    heroAlt: "Luxury furnished residence on Palm Jumeirah, Dubai",
    badge: "Palm Jumeirah Furnishing",
    h1: "Furnishing on Palm Jumeirah",
    subtitle:
      "Luxury-tier furnishing for the Palm's apartments and villas — interiors that match a beachfront address.",
    intro: [
      "Palm Jumeirah is Dubai's most photographed address, and its short-stay market runs on aspiration: guests book the Palm for the experience, and they choose between listings based almost entirely on interiors and views. A beachfront unit with underwhelming furniture leaves serious nightly revenue on the table.",
      "Furnishing on the Palm skews naturally toward our Luxury tier — richer materials, upgraded wall design, and layered styling that photographs at the standard of the island's hotel neighbours. For villa owners, we scope full-home projects including outdoor and terrace living areas.",
      "Island logistics are their own discipline: gated communities, trunk-road access, and building-specific delivery rules. Our team plans Palm deliveries and installations around these constraints so the setup runs without surprises.",
    ],
    whyFurnish: [
      {
        title: "Aspirational Short-Stay Market",
        desc: "Palm guests pay for the experience — interiors drive nightly rates more than anywhere else in Dubai.",
      },
      {
        title: "Villa-Scale Projects",
        desc: "Complete villa furnishing including outdoor living, terraces, and multi-bedroom layouts.",
      },
      {
        title: "Island Logistics Managed",
        desc: "Gated-community access, delivery scheduling, and building rules handled by our team.",
      },
    ],
    popularBuildings: [
      "Shoreline Apartments",
      "Golden Mile",
      "The Palm Tower",
      "One Palm",
      "Tiara Residences",
      "Garden Homes & Signature Villas",
    ],
    faqs: [
      {
        q: "Do you furnish villas on Palm Jumeirah or only apartments?",
        a: "Both. Apartment packages follow our standard tiers, while Garden Homes and Signature Villas are scoped as custom full-home projects, typically including outdoor and terrace furniture.",
      },
      {
        q: "Which package tier suits a Palm Jumeirah holiday home?",
        a: "Luxury is the most common choice on the Palm — the island's nightly rates reward richer styling and upgraded wall design with materially better listing performance. Premium suits secondary bedrooms or long-term lets.",
      },
      {
        q: "Can you handle deliveries to gated Palm communities?",
        a: "Yes. We arrange community gate passes, building delivery permits, and installation slots as part of every Palm project — island logistics are factored into the plan from day one.",
      },
      {
        q: "How long does a Palm Jumeirah setup take?",
        a: "Apartments run on our standard 5–15 business-day window. Villas depend on scope and are scheduled as phased installations, typically two to four weeks for a full home.",
      },
    ],
    nearby: ["dubai-marina", "downtown-dubai", "dubai-hills-estate"],
    relatedBlog: {
      title: "How to Maximize Holiday Home ROI in Dubai Marina",
      href: "/blog/maximize-holiday-home-roi-dubai-marina",
    },
  },
  {
    slug: "dubai-hills-estate",
    areaName: "Dubai Hills Estate",
    title: "Home Furnishing in Dubai Hills Estate | Furniture Packages | Aziza Home",
    metaDescription:
      "Furniture packages for Dubai Hills Estate apartments, townhouses and villas. Family-focused turnkey furnishing in Emaar's green master community.",
    keywords:
      "dubai hills furnishing, furniture package dubai hills estate, furnish apartment dubai hills, dubai hills villa furnishing, family home furnishing dubai, emaar community furnishing",
    heroImage: heroHills,
    heroAlt: "Furnished family home in Dubai Hills Estate",
    badge: "Dubai Hills Furnishing",
    h1: "Home Furnishing in Dubai Hills Estate",
    subtitle:
      "Warm, family-focused furnishing for apartments, townhouses and villas in Emaar's flagship green community.",
    intro: [
      "Dubai Hills Estate has become the default choice for families upgrading within Dubai — a master-planned community built around a golf course, parks, and schools. Its tenants are long-stayers: families who choose a home for years, not months, and who respond strongly to warm, liveable interiors at viewings.",
      "The community spans everything from Park Heights apartments to large golf-course villas, and our approach scales with it. Apartment owners typically take Essential or Premium packages; townhouse and villa owners scope fuller projects with family storage, kids' rooms, and garden furniture.",
      "Handovers in Dubai Hills continue building by building, and many owners furnish immediately after receiving keys — either to move in or to catch the strong family-rental demand before the next tower hands over. We time setups around Emaar handover schedules and community access procedures.",
    ],
    whyFurnish: [
      {
        title: "Long-Stay Family Tenants",
        desc: "Hills tenants sign for years. Move-in-ready family homes win viewings and reduce turnover.",
      },
      {
        title: "New-Handover Ready",
        desc: "We time furnishing around Emaar handovers so your unit earns from week one.",
      },
      {
        title: "Apartments to Villas",
        desc: "Packages scale from 1BR apartments to full villa projects with garden and outdoor living.",
      },
    ],
    popularBuildings: [
      "Park Heights",
      "Collective",
      "Golfville",
      "Executive Residences",
      "Maple townhouses",
      "Sidra & Golf Place villas",
    ],
    faqs: [
      {
        q: "Do you furnish brand-new handover units in Dubai Hills?",
        a: "Yes — post-handover furnishing is our most common Dubai Hills request. Send us your handover date and layout, and we schedule design and delivery so the home is ready within about two weeks of receiving keys.",
      },
      {
        q: "Can you furnish a full villa in Dubai Hills Estate?",
        a: "Yes. Villas in Sidra, Maple, and Golf Place are scoped as custom projects covering living and dining areas, all bedrooms, kids' rooms, and outdoor furniture. Quotations follow a design consultation.",
      },
      {
        q: "What furniture style works for Dubai Hills family rentals?",
        a: "Warm minimalism performs best — durable fabrics, natural woods, and practical storage. It photographs beautifully for listings while standing up to real family life, which protects your furniture investment across tenancies.",
      },
      {
        q: "How long does furnishing take in Dubai Hills?",
        a: "Apartments complete in the standard 5–15 business days. Townhouses and villas are phased by floor and typically take two to four weeks depending on scope.",
      },
    ],
    nearby: ["downtown-dubai", "jumeirah-village-circle", "business-bay"],
    relatedBlog: {
      title: "Where to Invest in Dubai: Best ROI & Property Growth",
      href: "/blog/where-to-invest-dubai-best-roi-property-growth",
    },
  },
  {
    slug: "city-walk",
    areaName: "City Walk",
    title: "Apartment Furnishing in City Walk Dubai | Furniture Packages | Aziza Home",
    metaDescription:
      "Design-led furniture packages for City Walk apartments. Turnkey furnishing for Dubai's premium urban lifestyle district — residences and Central Park at City Walk.",
    keywords:
      "city walk furnishing, furniture package city walk dubai, furnish apartment city walk, central park city walk furnishing, city walk residences furnishing, meraas city walk interior design",
    heroImage: heroCityWalk,
    heroAlt: "Furnished designer apartment in City Walk, Dubai",
    badge: "City Walk Furnishing",
    h1: "Apartment Furnishing in City Walk",
    subtitle:
      "Design-led furniture packages for Dubai's boutique urban district — interiors that match City Walk's gallery-street aesthetic.",
    intro: [
      "City Walk is Dubai's design district in the most literal sense — residents step out of their lobby onto curated retail boulevards, street art, and some of the city's best cafés. Tenants who choose City Walk are buying into an aesthetic, and they notice immediately when an apartment's interior doesn't live up to the neighbourhood outside the window.",
      "The district's low-rise Meraas residences and the newer Central Park towers attract a distinct tenant mix: affluent professionals and small families who want walkable urban living without a high-rise, plus a strong short-stay market driven by Coca-Cola Arena events and the area's dining scene. Both audiences pay a premium — and both choose from photos.",
      "Our City Walk setups lean contemporary: cleaner lines and gallery-inspired styling that echo the district's architecture, in the Premium and Luxury tiers most owners here select. Deliveries and installations are coordinated with Meraas community management, including boulevard access windows and service routes.",
    ],
    whyFurnish: [
      {
        title: "Design-Conscious Tenants",
        desc: "City Walk residents choose the district for its aesthetic — interiors must match the standard of the streets outside.",
      },
      {
        title: "Event-Driven Short Stays",
        desc: "Coca-Cola Arena and the dining scene feed a premium short-stay market that books on photos.",
      },
      {
        title: "Meraas Logistics Handled",
        desc: "We coordinate boulevard access, delivery windows, and installation with community management.",
      },
    ],
    popularBuildings: [
      "City Walk Residences (Buildings 1–24)",
      "Central Park at City Walk",
      "Celadon",
      "Laurel",
      "Erin",
      "Myrtle",
    ],
    faqs: [
      {
        q: "Which furnishing style suits a City Walk apartment?",
        a: "Contemporary and warm-minimal directions perform best — clean lines, natural materials, and gallery-inspired styling that mirror the district's architecture. Most City Walk owners choose our Premium or Luxury tiers to match the neighbourhood's standard.",
      },
      {
        q: "Do you furnish Central Park at City Walk handover units?",
        a: "Yes — post-handover furnishing in Central Park's towers is a frequent request. Send us your handover date and layout, and we schedule design and installation so the apartment is ready shortly after you receive keys.",
      },
      {
        q: "Is City Walk good for short-term rental furnishing?",
        a: "Yes. City Walk's dining scene and Coca-Cola Arena events support a premium short-stay market. Styled interiors materially affect nightly rates here, so holiday-home owners typically choose Premium or Luxury styling aimed at listing photography.",
      },
      {
        q: "How long does a City Walk furnishing project take?",
        a: "Standard apartments complete in 5–15 business days after confirmation and access. We arrange Meraas community delivery permits and service-route bookings as part of the project, so access rules don't add delays.",
      },
    ],
    nearby: ["downtown-dubai", "business-bay", "palm-jumeirah"],
    relatedBlog: {
      title: "Quick, Efficient Ways to Furnish Your Home",
      href: "/blog/quick-efficient-ways-to-furnish-your-home",
    },
  },
];

export const getLocationPage = (slug: string | undefined): LocationPageData | undefined =>
  locationPages.find((p) => p.slug === slug);

/** Shared starting-price table (matches /investors-furnishing-dubai) */
export const locationPricing = [
  { layout: "Studio", essential: "from AED 22,500", premium: "from AED 26,500", luxury: "from AED 30,500" },
  { layout: "1 Bedroom", essential: "from AED 30,000", premium: "from AED 36,500", luxury: "from AED 46,000" },
  { layout: "2 Bedroom", essential: "from AED 40,000", premium: "from AED 55,000", luxury: "from AED 65,500" },
  { layout: "3 Bedroom", essential: "from AED 52,500", premium: "from AED 72,800", luxury: "from AED 88,600" },
];
