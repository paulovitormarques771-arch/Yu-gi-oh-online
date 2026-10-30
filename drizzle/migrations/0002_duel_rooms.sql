CREATE TABLE public.duel_rooms (
  id text PRIMARY KEY,
  host_id uuid NOT NULL,
  guest_id uuid,
  host_name text NOT NULL DEFAULT 'Anfitrião',
  guest_name text,
  status text NOT NULL DEFAULT 'waiting',
  state jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.duel_rooms TO authenticated;
GRANT ALL ON public.duel_rooms TO service_role;
ALTER TABLE public.duel_rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants or open rooms readable" ON public.duel_rooms FOR SELECT TO authenticated
  USING (auth.uid() = host_id OR auth.uid() = guest_id OR status = 'waiting');
CREATE POLICY "Host creates room" ON public.duel_rooms FOR INSERT TO authenticated WITH CHECK (auth.uid() = host_id);
CREATE POLICY "Participants update room" ON public.duel_rooms FOR UPDATE TO authenticated
  USING (auth.uid() = host_id OR auth.uid() = guest_id) WITH CHECK (auth.uid() = host_id OR auth.uid() = guest_id);
CREATE POLICY "Host deletes room" ON public.duel_rooms FOR DELETE TO authenticated USING (auth.uid() = host_id);
CREATE TRIGGER duel_rooms_updated_at BEFORE UPDATE ON public.duel_rooms FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE FUNCTION public.join_duel_room(_room text, _name text)
RETURNS public.duel_rooms LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.duel_rooms;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Faça login para entrar'; END IF;
  SELECT * INTO r FROM public.duel_rooms WHERE id = upper(_room) FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Sala não encontrada'; END IF;
  IF r.host_id = auth.uid() OR r.guest_id = auth.uid() THEN RETURN r; END IF;
  IF r.guest_id IS NOT NULL THEN RAISE EXCEPTION 'Sala já está cheia'; END IF;
  UPDATE public.duel_rooms SET guest_id = auth.uid(), guest_name = left(coalesce(nullif(trim(_name),''),'Convidado'),20), status = 'ready'
    WHERE id = r.id RETURNING * INTO r;
  RETURN r;
END $$;
REVOKE EXECUTE ON FUNCTION public.join_duel_room(text, text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.join_duel_room(text, text) TO authenticated;
ALTER PUBLICATION supabase_realtime ADD TABLE public.duel_rooms;