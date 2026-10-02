# Purchase-link readiness cleanup

## Changes
- Replace the two remaining instructions that describe a purchase link as required.
- Define an incomplete FF&E item as missing either its supplier or unit cost.
- Use that shared check for budget gap counts, filtering, row warnings, and readiness copy.
- Remove the unused `missingLink` helper while preserving the optional Link field and existing-link display.
- Correct the workspace rule that still says budget submission requires a purchase link.

## Verification
- Search all workspace `product_url`, `missingLink`, and link references to confirm none gates readiness.
- Run the TypeScript typecheck and inspect the latest preview build result.

## Boundaries
- No database, SQL, permissions, contract, proposal, or project-value changes.
