# Proposal FF&E drift warning

## Changes
- Add one exported item-list comparison helper beside the proposal document model. It will compare room plus item/quantity content without considering room or row order, and return added, removed, and quantity-changed counts.
- Compare each stored proposal item list with the non-empty live FF&E groups already loaded by the proposal editor.
- Show the drift summary above the proposal document for both the GM and sales owner.
- For Draft proposals, show an amber warning with an **Update item list** button. The button will copy only the live item groups into the draft and mark it unsaved; quotation prices remain untouched.
- For Sent and Accepted proposals, show a warning without an update action and direct the user to create a new version.
- Suppress the warning entirely when the live FF&E list is empty or the lists differ only in ordering.

## Technical details
- Preserve duplicate item names correctly by matching quantities within each room/item key rather than collapsing rows into a simple set.
- Reuse the existing `change` and save flow so updating a Draft clears finalisation and requires an explicit save.
- Do not alter quotation data, toggles, contracts, permissions, database code, or SQL.

## Verification
- Run the workspace TypeScript typecheck.
- Check the latest preview build diagnostics after the edits.
