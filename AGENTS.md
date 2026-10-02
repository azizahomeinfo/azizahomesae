# Architecture rules

- Workspace (/workspace) rules live in src/workspace/AGENTS.md: DB functions and guards own every state change; roles enforced in RLS/storage, never UI only.
