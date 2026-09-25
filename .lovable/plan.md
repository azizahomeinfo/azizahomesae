# Requirement brief section deletion

## Changes
- Add a trash control beside every FF&E section heading, including standard sections.
- Open the app’s existing confirmation dialog before deletion, naming the section and its item count and noting that standard sections can be restored.
- Delete through the existing brief update/autosave path so closing and reopening preserves the change.
- Keep section numbers derived from their current position, so numbering remains contiguous automatically.

## Verification
- Confirm a newly added section can be deleted back to the prior state.
- Confirm deleting Bathroom updates numbering and counts, persists, and Restore standard checklist adds it back.
- Check the current build signal after the edit.