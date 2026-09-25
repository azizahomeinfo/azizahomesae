# Architecture rules

- Contracts have two routes (accepted proposal, or direct from the lead); `contracts.source` is derived by `ws_contract_guard` from `proposal_id` and never set by the app, so the "no GM quotation" trail can't be forged.
