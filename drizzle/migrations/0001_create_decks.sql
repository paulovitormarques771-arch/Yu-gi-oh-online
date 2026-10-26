CREATE TABLE public.decks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 40),
  is_main BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.decks TO authenticated;
GRANT ALL ON public.decks TO service_role;

ALTER TABLE public.decks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own decks"
  ON public.decks FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.deck_cards (
  deck_id UUID NOT NULL REFERENCES public.decks(id) ON DELETE CASCADE,
  card_id BIGINT NOT NULL,
  copies INT NOT NULL CHECK (copies BETWEEN 1 AND 3),
  PRIMARY KEY (deck_id, card_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.deck_cards TO authenticated;
GRANT ALL ON public.deck_cards TO service_role;

ALTER TABLE public.deck_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage cards of their own decks"
  ON public.deck_cards FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.decks d WHERE d.id = deck_id AND d.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.decks d WHERE d.id = deck_id AND d.user_id = auth.uid()));

CREATE OR REPLACE FUNCTION public.enforce_deck_size()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF (SELECT COALESCE(SUM(copies), 0) FROM public.deck_cards WHERE deck_id = NEW.deck_id) > 45 THEN
    RAISE EXCEPTION 'Um deck pode ter no máximo 45 cartas';
  END IF;
  RETURN NEW;
END;
$$;

CREATE CONSTRAINT TRIGGER deck_cards_max_45
  AFTER INSERT OR UPDATE ON public.deck_cards
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION public.enforce_deck_size();

CREATE TRIGGER decks_updated_at
  BEFORE UPDATE ON public.decks
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();