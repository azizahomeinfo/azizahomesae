-- Sales can ask design for a mood board and renders on a package lead.
--
-- Veronica, 2026-11-16, on Fouad (L-1096): "at the beginning we only gave him the package proposal,
-- and now everything is confirmed... we need to give them a detailed moodboard or render on their
-- proposal, but there is no option for sales to request that."
--
-- A package proposal is sales-only: catalog photography, the price list, no designer. The two routes
-- in NewProposalDialog were one-way — once sales had gone the package route there was no way back to
-- design. Worse, ws_assign_lead_designer stamps a brief carrying extra.package straight to
-- 'Design Approved', so a package lead could never enter the design queue even with a designer on it.
--
-- This opens that gate. It clears the package short-circuit, gives the designer the item list that was
-- sold (the brief's own ffe is empty on a package lead - the list lives in ffe_items), and puts the
-- brief back in the design queue: with a designer already on the lead it goes to 'Assigned', otherwise
-- to 'Submitted' for the GM to assign. Prices and the existing proposals are untouched.

CREATE OR REPLACE FUNCTION public.ws_request_design_for_package(_lead uuid)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  l public.leads; b public.requirement_briefs; seeded jsonb; new_status public.brief_status; u uuid; n int;
BEGIN
  SELECT * INTO l FROM public.leads WHERE id = _lead FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Lead not found'; END IF;
  IF NOT (public.is_gm(auth.uid()) OR l.sales_id = auth.uid()) THEN
    RAISE EXCEPTION 'Only the sales owner or the GM can ask design for renders on this lead';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.proposals p
                  WHERE p.lead_id = _lead AND p.line_items->>'source' = 'package') THEN
    RAISE EXCEPTION 'This lead has no package proposal - use the requirement brief instead';
  END IF;

  SELECT * INTO b FROM public.requirement_briefs WHERE lead_id = _lead FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'This lead has no requirement brief yet'; END IF;

  -- The designer must see what was actually sold. On a package lead the brief's own ffe is empty and
  -- the list lives in ffe_items, so lift it across, keeping the rooms and the order sales set.
  IF coalesce(jsonb_array_length(b.ffe), 0) = 0 THEN
    SELECT coalesce(jsonb_agg(sec ORDER BY ord), '[]'::jsonb) INTO seeded
      FROM (
        SELECT jsonb_build_object(
                 'code', '', 'title', f.room, 'notesLabel', 'Alt / Spec Notes',
                 'items', jsonb_agg(jsonb_build_object(
                            'item', f.item,
                            'std', trim(to_char(f.qty, 'FM999990.##')),
                            'included', 'inc') ORDER BY f.sort_order, f.item)) AS sec,
               min(f.sort_order) AS ord
          FROM public.ffe_items f
         WHERE f.lead_id = _lead AND f.project_id IS NULL
         GROUP BY f.room
      ) s;
    IF jsonb_array_length(seeded) > 0 THEN
      UPDATE public.requirement_briefs SET ffe = seeded WHERE id = b.id;
    END IF;
  END IF;

  new_status := CASE WHEN b.designer_id IS NOT NULL THEN 'Assigned' ELSE 'Submitted' END;

  -- extra.package is what short-circuits the design stage; drop it so the brief behaves normally.
  UPDATE public.requirement_briefs
     SET extra = coalesce(extra, '{}'::jsonb) - 'package',
         status = new_status,
         submitted_at = coalesce(submitted_at, now()),
         assigned_at = CASE WHEN b.designer_id IS NOT NULL THEN coalesce(assigned_at, now()) ELSE assigned_at END,
         approved_at = NULL
   WHERE id = b.id;

  SELECT coalesce(sum(jsonb_array_length(s->'items')), 0) INTO n
    FROM public.requirement_briefs rb, jsonb_array_elements(rb.ffe) s WHERE rb.id = b.id;

  IF b.designer_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, kind, title, body, lead_id)
    VALUES (b.designer_id, 'brief', l.name || ' - mood board and renders requested',
            'Sales sold this one from a package and the client has now confirmed. The item list that was '
            || 'sold is on the brief (' || n || ' items). Produce the mood board and renders against it.', _lead);
  ELSE
    FOR u IN SELECT user_id FROM public.workspace_members WHERE role = 'gm' AND active LOOP
      INSERT INTO public.notifications (user_id, kind, title, body, lead_id)
      VALUES (u, 'brief', l.name || ' - renders requested, assign a designer',
              'Sales asked design for a mood board and renders on a package lead. Assign a designer.', _lead);
    END LOOP;
  END IF;

  RETURN jsonb_build_object('status', new_status, 'items', n);
END $function$;

REVOKE ALL ON FUNCTION public.ws_request_design_for_package(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.ws_request_design_for_package(uuid) TO authenticated;
