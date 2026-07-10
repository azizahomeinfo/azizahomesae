// ─────────────────────────────────────────────────────────────────────────────
// Real project case studies ("/portfolio/<slug>").
// RULES: every entry documents a REAL completed project with facts provided
// by the owner (building, tier, timeline) and the project's own photos.
// Never invent metrics or client details. When adding a project: add the
// photos to src/assets as case-<slug>-N.webp, add the entry here, and add
// the route to routesToPrerender in prerender.js.
// ─────────────────────────────────────────────────────────────────────────────

import palace1 from "@/assets/case-palace-emaar-beachfront-1.webp";
import palace2 from "@/assets/case-palace-emaar-beachfront-2.webp";
import palace3 from "@/assets/case-palace-emaar-beachfront-3.webp";
import palace4 from "@/assets/case-palace-emaar-beachfront-4.webp";
import palace5 from "@/assets/case-palace-emaar-beachfront-5.webp";

export interface CaseStudyImage {
  src: string;
  alt: string;
  caption: string;
}

export interface CaseStudyData {
  slug: string;
  /** Building / project name as shown on the page */
  building: string;
  area: string;
  /** Slug of the matching location page for cross-linking, if one exists */
  areaSlug?: string;
  packageTier: "Essential" | "Premium" | "Luxury";
  timeline: string;
  title: string;
  metaDescription: string;
  keywords: string;
  h1: string;
  subtitle: string;
  /** Narrative sections: heading + paragraphs */
  sections: { heading: string; paragraphs: string[] }[];
  images: CaseStudyImage[];
  /** Index into images[] used as the hero */
  heroIndex: number;
}

export const caseStudies: CaseStudyData[] = [
  {
    slug: "palace-emaar-beachfront",
    building: "Palace, Emaar Beachfront",
    area: "Emaar Beachfront, Dubai Harbour",
    areaSlug: "dubai-marina",
    packageTier: "Luxury",
    timeline: "15 days",
    title: "Palace, Emaar Beachfront — Luxury Furnishing Project | Aziza Home",
    metaDescription:
      "Real project: complete Luxury-tier furnishing of an apartment in Palace, Emaar Beachfront — custom feature walls, designer furniture, and sea-view styling delivered in 15 days by Aziza Home.",
    keywords:
      "palace emaar beachfront furnishing, emaar beachfront apartment furnishing, palace beach residence interior, dubai harbour apartment furnishing, luxury furniture package dubai, emaar beachfront interior design",
    h1: "Palace, Emaar Beachfront",
    subtitle:
      "A complete Luxury-tier transformation on Dubai Harbour — from bare handover to sea-view sanctuary in 15 days.",
    sections: [
      {
        heading: "The Project",
        paragraphs: [
          "This apartment in Palace at Emaar Beachfront came to us as a bare handover unit — white walls, stone floors, and one exceptional asset: open sea views across Dubai Harbour toward the Marina skyline. The owner chose our Luxury package to bring the interior up to the standard of the address, and the full transformation was completed in 15 days.",
          "The design direction pairs warm minimalism with the coastal setting: ivory bouclé seating, walnut millwork, natural stone, and restrained touches of sage green and terracotta that pick up the light off the water.",
        ],
      },
      {
        heading: "Living & Dining",
        paragraphs: [
          "The open-plan living area is anchored by a modular bouclé sofa and matching ottoman around a sculptural marble coffee table on turned-timber sphere legs, layered over a textured champagne rug. A sage-green barrel chair adds a soft accent against the neutral palette, and an olive tree brings the greenery indoors.",
          "The dining corner carries the same language: a round marble-top table on a conical walnut base, ringed by sculptural keyhole-back chairs in ash and bouclé — a compact four-seat setting that photographs beautifully without crowding the floor plan.",
        ],
      },
      {
        heading: "The Feature Wall",
        paragraphs: [
          "The room's centrepiece is a fully built media wall in the Luxury tier's signature style: a recessed television framed in crisp white joinery, a floating walnut console with LED underlighting, and backlit display shelving styled with curated ceramics and art books. Classic wall moulding and a fluted panel detail — punctuated by a trio of scalloped brass sconces — give the wall depth that flat paint can't achieve.",
        ],
      },
      {
        heading: "The Bedroom",
        paragraphs: [
          "The bedroom is designed around a full-height arched plaster feature wall that mirrors the curve of the upholstered headboard, flanked by walnut piers with slim linear sconces. A sculptural fabric pendant floats above crisp white bedding layered with terracotta and sage cushions, and the room opens to a furnished balcony with the sea beyond — guest-ready down to the rolled towels.",
        ],
      },
      {
        heading: "The Result",
        paragraphs: [
          "Fifteen days after starting, the owner received a fully styled, photography-ready home: every room furnished, curtains hung, shelves styled, and the balcony dressed for the view. Delivery permits, service-elevator bookings, and installation at Emaar Beachfront were handled end to end by our team.",
        ],
      },
    ],
    images: [
      {
        src: palace1,
        alt: "Open-plan living and dining room in Palace Emaar Beachfront with marble dining table, bouclé sofa and sea view — furnished by Aziza Home",
        caption: "Open-plan living and dining with sea views across Dubai Harbour",
      },
      {
        src: palace2,
        alt: "Bedroom in Palace Emaar Beachfront with arched plaster feature wall, walnut sconce piers and terracotta accent cushions",
        caption: "Bedroom with full-height arched feature wall and balcony access",
      },
      {
        src: palace3,
        alt: "Ivory modular bouclé sofa with marble coffee table and panelled feature wall in Palace Emaar Beachfront living room",
        caption: "Modular bouclé seating against classic wall moulding and fluted panelling",
      },
      {
        src: palace4,
        alt: "Backlit walnut display shelves styled with ceramics beside green armchair in Palace Emaar Beachfront",
        caption: "Styled display shelving detail",
      },
      {
        src: palace5,
        alt: "Media feature wall with recessed TV, floating walnut console and LED lighting in Palace Emaar Beachfront",
        caption: "Custom media wall with floating walnut console and backlit shelving",
      },
    ],
    heroIndex: 0,
  },
];

export const getCaseStudy = (slug: string | undefined): CaseStudyData | undefined =>
  caseStudies.find((c) => c.slug === slug);
