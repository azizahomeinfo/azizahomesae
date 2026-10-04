# Move proposal pictures between pages

## Changes
- Add accessible up/down controls to every render-page and mood-board thumbnail when the proposal is editable.
- Treat render pages followed by the mood board as one ordered picture sequence, moving across page boundaries without changing page titles, descriptions, or page order.
- Refuse moves into a render page that already contains six pictures and explain the limit in a toast.
- Route every successful move through the existing document change path so the draft becomes unsaved and finalisation clears.

## Validation
- Run the TypeScript check and confirm the preview build is healthy.

## Scope
- Frontend only; no SQL or schema changes. The default one-page-per-room grouping remains unchanged.
