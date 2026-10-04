# Remove proposal picture captions

## Changes
- Remove the caption line from all room and mood-board pages while retaining captions as image alternative text.
- Return the removed caption space to the image slots and document why captions are intentionally not printed.
- Remove caption editing fields and their callbacks from the proposal rail while preserving image movement, removal, and thumbnails.

## Validation
- Run the TypeScript check and confirm the preview build is healthy.
- Check both Sukhrob proposals on screen and in print for image ratio, containment, note/footer spacing, and caption absence.
- Capture the B2814 Bedrooms page without saving proposal data and report one-, two-, and three-picture sizes.

## Scope
- Frontend only; no SQL or proposal data changes.
