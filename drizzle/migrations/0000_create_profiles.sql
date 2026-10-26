CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname TEXT NOT NULL,
  avatar_url TEXT,
  favorite_character TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT nickname_length CHECK (char_length(nickname) BETWEEN 3 AND 20),
  CONSTRAINT nickname_format CHECK (nickname ~ '^[A-Za-z0-9_]+$')
);

CREATE UNIQUE INDEX profiles_nickname_lower_key ON public.profiles (lower(nickname));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_nickname TEXT;
  final_nickname TEXT;
  suffix INT := 0;
BEGIN
  base_nickname := COALESCE(
    NULLIF(trim(NEW.raw_user_meta_data ->> 'nickname'), ''),
    NULLIF(split_part(NEW.email, '@', 1), ''),
    'duelista'
  );
  base_nickname := regexp_replace(base_nickname, '[^A-Za-z0-9_]', '', 'g');
  IF char_length(base_nickname) < 3 THEN
    base_nickname := base_nickname || '_duelista';
  END IF;
  base_nickname := left(base_nickname, 16);

  final_nickname := base_nickname;
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE lower(nickname) = lower(final_nickname)) LOOP
    suffix := suffix + 1;
    final_nickname := left(base_nickname, 16) || suffix::TEXT;
  END LOOP;

  INSERT INTO public.profiles (id, nickname)
  VALUES (NEW.id, final_nickname);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();