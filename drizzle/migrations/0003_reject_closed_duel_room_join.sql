CREATE OR REPLACE FUNCTION public.join_duel_room(_room text, _name text)
RETURNS public.duel_rooms LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.duel_rooms;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Faça login para entrar'; END IF;
  SELECT * INTO r FROM public.duel_rooms WHERE id = upper(_room) FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Sala não encontrada'; END IF;
  IF r.host_id = auth.uid() OR r.guest_id = auth.uid() THEN RETURN r; END IF;
  IF r.status = 'finished' THEN RAISE EXCEPTION 'Esta sala foi encerrada'; END IF;
  IF r.guest_id IS NOT NULL THEN RAISE EXCEPTION 'Sala já está cheia'; END IF;
  UPDATE public.duel_rooms SET guest_id = auth.uid(), guest_name = left(coalesce(nullif(trim(_name),''),'Convidado'),20), status = 'ready'
    WHERE id = r.id RETURNING * INTO r;
  RETURN r;
END $$;
REVOKE EXECUTE ON FUNCTION public.join_duel_room(text, text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.join_duel_room(text, text) TO authenticated;