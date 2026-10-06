# Architecture rules

- Workspace (/workspace) rules live in src/workspace/AGENTS.md: DB functions and guards own every state change; roles enforced in RLS/storage, never UI only.
- Frontend buying-run labels are defined by `PRIORITY_BANDS` and resolved only through `bandLabel`, so unknown database band numbers cannot render undefined labels.
