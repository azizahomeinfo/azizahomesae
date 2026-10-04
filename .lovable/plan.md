# One room per proposal page

## Changes
- Preserve an image’s room when its kind changes to Mood board; keep Floor plan behavior unchanged.
- Add an Area selector to each editable design thumbnail, using standard and current custom areas plus Mood Board.
- Update submission guidance so mood-board images are filed within their room area.
- Group proposal images by room, ordering renders before mood-board-kind images and rooms by the canonical area sequence.
- Keep only generic Mood Board images on the trailing mood-board page and preserve the current hero fallback.
- Refresh saved proposal pages by area without losing edited titles, descriptions, proposal uploads, or hand-created pages.

## Technical details
- Reuse the existing image update mutation and shared change notification callback.
- Keep two images per generated page; pagination labels remain unchanged.
- Add focused model checks for mixed render/mood images, custom area order, generic Mood Board handling, and saved-page merging where practical.
- Run the TypeScript check and preview diagnostics, then verify the move-to-room flow in the preview without leaving test data changed.

## Scope
- Frontend only. No SQL, schema changes, or data migration.
