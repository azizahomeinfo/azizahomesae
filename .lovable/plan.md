# Balance paginated proposal item lists

## Scope
- Change only item-list pagination and oversized room-group flow.
- Preserve single-page lists, investment combining, document styling, and all other proposal behavior.

## Implementation
- Calculate total item weight first, derive the required page count from the existing hard cap, then target an even weight per page without exceeding the cap.
- Mark room groups taller than one available column as splittable; normal groups remain unbroken.
- When an oversized room continues in a later column, repeat its room heading with a continuation marker.

## Validation
- Check the 107-item, 8-room scenario for two similarly filled pages and populated columns.
- Check a small list remains one page and investment still combines on the final item page.
- Verify the fixed 794×1123 layout in the browser and confirm the project build remains healthy.
