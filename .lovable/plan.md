# Coordinator orientation

## Build
- Add a role-aware guide content model keyed by workspace role, populated only for coordinators.
- Create the “How my job works” page with the supplied handbook copy, clear card sections, and links to Projects, Tasks, and Suppliers.
- Add `/workspace/guide` to workspace routing, page metadata, and coordinator navigation only.

## Verification
- Run the project TypeScript check.
- Verify coordinator visibility and confirm the guide is absent for GM, sales, and designer roles.
- Open the guide at 390px and capture a screenshot to check mobile readability.

## Technical details
- Keep access enforcement consistent with the existing workspace `Guard` and `PAGES_BY_ROLE` patterns.
- Store guide sections in `GUIDES: Record<WorkspaceRole, Section[]>`, leaving non-coordinator arrays empty without rendering placeholder copy.
- This is frontend-only; no database or permission changes.
