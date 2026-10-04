# Uniform proposal image frames and crop warnings

## Build
- Remove the render/mood-board fit distinction so every area picture fills the existing 682 × 362 frame edge to edge with centered `cover` cropping.
- Keep lone and paired frames vertically centred with the existing even gutter; keep the muted broken-image placeholder without a card, border, or padding.
- Add one shared crop calculation based on each image’s natural dimensions and the 682 × 362 frame. Flag loss above 25%.
- Show the measured crop percentage beside each render thumbnail and add a read-only Mood board section with the same warnings.
- Before finalising or downloading, show a confirmation listing the affected page names and image count. Continue prints normally; cancel returns to editing.

## Constraints
- Frontend only; no SQL or schema changes.
- Leave the cover, floor plan, item list, investment content, and print rules unchanged.
- Run the TypeScript check and verify the proposal editor in the preview without saving data.

## Technical details
- Keep measured crop state keyed by storage path in the proposal editor and reuse a pure crop-percentage helper in preview rendering.
- Remove `fit` from the `Sheet` area variant and from `layoutSheets`; mood-board pages use the same area-page construction as render pages.
