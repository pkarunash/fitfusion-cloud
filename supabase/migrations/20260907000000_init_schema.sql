-- Roles
CREATE TYPE public.app_role AS ENUM ('admin','member');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  phone text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'member',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "own profile read" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "own roles read" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)), NEW.raw_user_meta_data->>'avatar_url')
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'member') ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.touch_updated_at() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

-- Site settings (singleton row, powers the app name/tagline shown in the header, footer and admin panel)
CREATE TABLE public.site_settings (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  site_name text NOT NULL DEFAULT 'World Gym',
  tagline text NOT NULL DEFAULT 'Protein, Equipment & Memberships',
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.site_settings TO anon, authenticated;
GRANT UPDATE ON public.site_settings TO authenticated;
GRANT ALL ON public.site_settings TO service_role;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings public read" ON public.site_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "settings admin write" ON public.site_settings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER site_settings_touch BEFORE UPDATE ON public.site_settings FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
INSERT INTO public.site_settings (id, site_name, tagline) VALUES (1, 'World Gym', 'Protein, Equipment & Memberships');

-- Products (gym equipment, protein/supplements, accessories — fully admin-managed)
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  category text NOT NULL DEFAULT 'protein',
  brand text,
  description text,
  price numeric(10,2) NOT NULL DEFAULT 0,
  mrp numeric(10,2),
  stock integer NOT NULL DEFAULT 0,
  rating numeric(2,1) NOT NULL DEFAULT 4.5,
  rating_count integer NOT NULL DEFAULT 0,
  images text[] NOT NULL DEFAULT '{}',
  specifications jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products public read" ON public.products FOR SELECT TO anon, authenticated USING (is_active OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "products admin write" ON public.products FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER products_touch BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Membership plans (fee tiers — fully admin-managed)
CREATE TABLE public.membership_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  duration_months integer NOT NULL DEFAULT 1,
  price numeric(10,2) NOT NULL DEFAULT 0,
  original_price numeric(10,2),
  description text,
  features text[] NOT NULL DEFAULT '{}',
  is_popular boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.membership_plans TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.membership_plans TO authenticated;
GRANT ALL ON public.membership_plans TO service_role;
ALTER TABLE public.membership_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "plans public read" ON public.membership_plans FOR SELECT TO anon, authenticated USING (is_active OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "plans admin write" ON public.membership_plans FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER plans_touch BEFORE UPDATE ON public.membership_plans FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Chat messages
CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text,
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "messages read own or admin" ON public.messages FOR SELECT TO authenticated
  USING (conversation_user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "messages insert own or admin" ON public.messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid() AND (conversation_user_id = auth.uid() OR public.has_role(auth.uid(),'admin')));
CREATE INDEX messages_conversation_idx ON public.messages (conversation_user_id, created_at);
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Seed products: protein powders and gym equipment
INSERT INTO public.products (name, slug, category, brand, description, price, mrp, stock, rating, rating_count, images, specifications) VALUES
('Whey Protein Isolate 2kg - Chocolate','whey-isolate-2kg-chocolate','protein','World Gym','Ultra-filtered whey isolate with 27g protein per scoop and under 1g sugar. Mixes instantly, zero bloating.',4299,6499,42,4.6,1284,'{}','[{"label":"Weight","value":"2 kg (60 servings)"},{"label":"Protein per serving","value":"27 g"},{"label":"BCAA","value":"6.2 g"},{"label":"Flavour","value":"Double Rich Chocolate"},{"label":"Form","value":"Powder"}]'),
('Whey Protein Concentrate 1kg - Vanilla','whey-concentrate-1kg-vanilla','protein','World Gym','Everyday whey concentrate with 24g protein for steady muscle recovery.',1999,2999,80,4.4,742,'{}','[{"label":"Weight","value":"1 kg (33 servings)"},{"label":"Protein per serving","value":"24 g"},{"label":"Flavour","value":"French Vanilla"},{"label":"Added sugar","value":"None"}]'),
('Mass Gainer 3kg - Banana','mass-gainer-3kg-banana','protein','BulkLab','High-calorie gainer with 60g protein and complex carbs for hardgainers.',2799,3999,25,4.2,318,'{}','[{"label":"Weight","value":"3 kg"},{"label":"Calories per serving","value":"1250 kcal"},{"label":"Protein per serving","value":"60 g"},{"label":"Flavour","value":"Banana Shake"}]'),
('Plant Protein 1kg - Unflavoured','plant-protein-1kg','protein','GreenRep','Pea and brown rice blend, vegan certified, 25g protein per scoop.',2199,2899,36,4.3,205,'{}','[{"label":"Weight","value":"1 kg"},{"label":"Protein per serving","value":"25 g"},{"label":"Source","value":"Pea + Brown Rice"},{"label":"Vegan","value":"Yes"}]'),
('Creatine Monohydrate 250g','creatine-monohydrate-250g','protein','World Gym','Micronised creatine for strength and power output. 5g unflavoured dose.',899,1399,120,4.7,980,'{}','[{"label":"Weight","value":"250 g (50 servings)"},{"label":"Dose","value":"5 g"},{"label":"Type","value":"Micronised Monohydrate"}]'),
('Adjustable Dumbbell Set 24kg','adjustable-dumbbell-24kg','equipment','FlexCore','Dial-a-weight dumbbell pair replacing 15 sets. Steel plates, rubber coated.',8999,13999,15,4.5,412,'{}','[{"label":"Max weight","value":"24 kg per dumbbell"},{"label":"Increments","value":"2 kg"},{"label":"Material","value":"Cast iron + rubber"},{"label":"Warranty","value":"2 years"}]'),
('Olympic Barbell 20kg','olympic-barbell-20kg','equipment','FlexCore','Chrome 7ft power bar rated to 300kg with dual knurl marks.',10499,14999,8,4.8,167,'{}','[{"label":"Length","value":"7 ft (2200 mm)"},{"label":"Weight","value":"20 kg"},{"label":"Load rating","value":"300 kg"},{"label":"Sleeve","value":"50 mm needle bearing"}]'),
('Foldable Treadmill T7','foldable-treadmill-t7','equipment','RunPro','3.5 HP motor, 16 km/h top speed, cushioned deck and app sync.',44999,59999,5,4.4,89,'{}','[{"label":"Motor","value":"3.5 HP peak"},{"label":"Top speed","value":"16 km/h"},{"label":"Incline","value":"12 levels"},{"label":"Max user weight","value":"130 kg"}]'),
('Power Rack Pro Cage','power-rack-pro','equipment','FlexCore','Commercial 4-post rack with pull-up bar, J-hooks and spotter arms.',27999,38999,6,4.6,54,'{}','[{"label":"Frame","value":"75 mm x 75 mm steel"},{"label":"Height","value":"2.1 m"},{"label":"Capacity","value":"450 kg"},{"label":"Includes","value":"J-hooks, spotter arms, pull-up bar"}]'),
('Resistance Band Set (5 bands)','resistance-band-set','accessory','FlexCore','Latex loop bands from 5 to 40 kg resistance with carry pouch.',799,1499,150,4.3,610,'{}','[{"label":"Bands","value":"5"},{"label":"Resistance","value":"5-40 kg"},{"label":"Material","value":"Natural latex"}]'),
('Lifting Belt 4-inch Leather','lifting-belt-leather','accessory','World Gym','Double-prong 4 inch leather belt for heavy squats and deadlifts.',2499,3499,45,4.7,231,'{}','[{"label":"Width","value":"4 inch"},{"label":"Thickness","value":"10 mm"},{"label":"Material","value":"Full grain leather"}]'),
('Shaker Bottle 700ml','shaker-bottle-700ml','accessory','BulkLab','Leak-proof BPA-free shaker with steel mixing ball and supplement tray.',449,799,200,4.1,522,'{}','[{"label":"Capacity","value":"700 ml"},{"label":"Material","value":"BPA-free Tritan"},{"label":"Mixer","value":"Steel ball"}]');

-- Seed membership plans (fees: 1499 / 2999 / 7999)
INSERT INTO public.membership_plans (name, duration_months, price, original_price, description, features, is_popular, sort_order) VALUES
('Monthly',1,1499,1999,'Full gym floor access, perfect to try us out.','{"Gym floor + cardio zone","Locker access","1 free body composition scan"}',false,1),
('Quarterly',3,2999,4497,'Best value with group classes and a coach check-in.','{"Everything in Monthly","Unlimited group classes","Monthly coach check-in","10% off store orders"}',true,2),
('Annual',12,7999,17988,'Full-year transformation package.','{"Everything in Quarterly","Custom diet plan","Free shaker + gym tee","20% off store orders"}',false,3);
