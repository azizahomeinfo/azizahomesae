## Goal

Currently the hero A/B test tracks two events: `view` and `cta_click`. Add a third event — `lead_submit` — so you can measure real conversion (form submissions) per variant, not just CTA clicks, and surface it on the `/seo-status` dashboard.

No database schema change is needed: the existing `ab_events.event_type` column is free-text and the RLS policy already allows anonymous inserts.

## Changes

### 1. Shared tracking helper — `src/hooks/useABVariant.ts`
- Export a new function `trackAbConversion(experiment: string)` that:
  - Reads the variant assigned for that experiment from `localStorage` (key `ab_variant_<experiment>`).
  - Reads/creates the session id (same logic as today).
  - Inserts an `ab_events` row with `event_type = 'lead_submit'`.
  - Silently no-ops on SSR or if no variant is assigned (visitor never saw the hero).

This keeps the SSR-safe dynamic import pattern already in place.

### 2. Fire `lead_submit` on successful form submissions
Call `trackAbConversion("hero_headline_v1")` after a successful insert in:
- `src/components/Contact.tsx` (contact_messages)
- `src/components/ClientInfoDialog.tsx` (client_submissions)
- `src/components/IntakeFormDialog.tsx` (intake_forms)

Only fire on success (after the Supabase insert resolves without error), before the success toast.

### 3. Dashboard — `src/pages/SeoStatus.tsx`
Extend the A/B card:
- Update `AbRow.event_type` union to include `'lead_submit'`.
- Update `AbStat` to add `leads: number` and `leadCvr: number` (leads / views).
- In `loadAbStats`, count `lead_submit` rows per variant alongside views/clicks.
- Render two extra columns/rows per variant: **Leads** and **Lead CVR %**, so you can compare click-through vs. true conversion.

### Out of scope
- No new table, no migration, no auth changes.
- No edge function changes.
- Existing `view` / `cta_click` behavior is unchanged.

## Technical notes

```text
ab_events
├── view         (fired in Hero useEffect — unchanged)
├── cta_click    (fired on hero CTA — unchanged)
└── lead_submit  (NEW — fired on Contact / ClientInfo / Intake success)
```

Conversion math on dashboard:
- Click CVR = clicks / views
- Lead CVR = leads / views

Variant attribution uses the variant stored in `localStorage` at the time of submission, so a visitor who saw variant B and later submits a form is correctly attributed to B even if they navigated to another page first.
