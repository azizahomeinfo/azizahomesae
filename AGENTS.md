# Architecture rules

- Contracts have two routes (accepted proposal, or direct from the lead); `contracts.source` is derived by `ws_contract_guard` from `proposal_id` and never set by the app, so the "no GM quotation" trail can't be forged.
- Brief visibility follows `can_see_lead` only; the unassigned "Submitted" queue (`ws_brief_queue`) is GM-only, so work reaches a designer solely through GM assignment.
- A design version reaches Submitted only via `ws_submit_design_package` (one transaction with the FF&E costing); `ws_design_guard` refuses it unless the lead's costing is exactly Submitted, so renders and costs never go out separately.
- A contract reaches Signed only via `ws_sign_contract(contract, handover)` (one transaction: project, lead → Won, FF&E project_id stamped, four drawing tasks, notifications); `ws_contract_guard` refuses any other path so a signed contract always has a project and a handover date.
- FF&E purchasing band is defined only by `ws_ffe_band` and set by trigger `ffe_items_band`; a hand change sets `priority_band_manual` and is never recomputed, so coordinator overrides survive edits.
- Brief FF&E jsonb becomes `ffe_items` only via `ws_seed_ffe_from_brief` (called by `ws_assign_brief`); proposals read `ffe_items` only, with no brief fallback, so a missing list shows up instead of being hidden.
- Drawing tasks mirror uploads: `ws_drawing_changed` on project_files calls `ws_sync_drawing_task` (done iff a file of that kind exists) and `tasks_drawing_guard` refuses hand ticks; category strings in DRAWING_KINDS/"Signed contract" are stable keys for any later Drive sync.
