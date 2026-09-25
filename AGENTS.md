# Architecture rules

- Contracts have two routes (accepted proposal, or direct from the lead); `contracts.source` is derived by `ws_contract_guard` from `proposal_id` and never set by the app, so the "no GM quotation" trail can't be forged.
- Brief visibility follows `can_see_lead` only; the unassigned "Submitted" queue (`ws_brief_queue`) is GM-only, so work reaches a designer solely through GM assignment.
- A design version reaches Submitted only via `ws_submit_design_package` (one transaction with the FF&E costing); `ws_design_guard` refuses it unless the lead's costing is exactly Submitted, so renders and costs never go out separately.
