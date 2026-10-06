# Architecture rules

- Workspace (/workspace) rules live in src/workspace/AGENTS.md: DB functions and guards own every state change; roles enforced in RLS/storage, never UI only.
- Frontend buying-run labels are defined by `PRIORITY_BANDS` and resolved only through `bandLabel`, so unknown database band numbers cannot render undefined labels.
- Coordinator/GM project countdown reads auto-task instructions and deadlines in Dubai time; contractor-date saves refresh project and task queries, leaving all scheduling to database triggers and money out of the panel.
