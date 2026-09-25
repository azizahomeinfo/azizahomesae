# Public package-price consistency sweep

## Scope
Audit and correct every visitor- or crawler-facing package price outside `/workspace`, using the supplied 12-value AED table as the only source of truth. Essential and Premium remain unchanged unless a public reference conflicts with that table.

## Changes
- Review public pages, shared data, all seven locale files, metadata, structured data, FAQs, articles, landing pages, static public files, prerender configuration, and WhatsApp copy.
- Replace stale package amounts, including every localized form of the old AED 28,900 starting price, with AED 22,500 in the locale’s existing number style.
- Correct package ranges and lowest/highest summaries to derive from AED 22,500–99,600.
- Preserve unrelated financial figures such as rent, property value, ROI, and case-study amounts; report them separately.
- Keep `/workspace` untouched.

## Verification
- Search all public sources for the five retired package prices in comma, dot, space, compact, and Arabic-digit formats.
- Check the current preview/build signal after edits.
- Report every changed file and the exact correction made.
