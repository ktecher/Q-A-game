-- ════════════════════════════════════════════════════════════════════
--   Drawing words — content for the Pictionary (sketch) challenge
--   Migration: 0004_drawing_words
-- ════════════════════════════════════════════════════════════════════
--
-- Adds:
--   - drawing_words   — the bilingual word pool a Pictionary drawer sketches
--   - public read + admin write RLS (same pattern as wala_kalma_titles)
--   - seed of the initial 60 words
--
-- The game reads is_active rows via src/lib/queries.js (useDrawingWords);
-- src/data/drawingWords.js remains the offline fallback.
-- ════════════════════════════════════════════════════════════════════

create table if not exists public.drawing_words (
  id            uuid primary key default gen_random_uuid(),
  word_ar       text not null,
  word_en       text not null,
  category_ar   text not null,
  category_en   text not null,
  is_active     boolean not null default true,
  display_order integer not null default 0,
  created_at    timestamptz not null default now()
);

alter table public.drawing_words enable row level security;

drop policy if exists "Drawing words public read" on public.drawing_words;
create policy "Drawing words public read" on public.drawing_words
  for select to anon, authenticated using (true);

drop policy if exists "Admins manage drawing words" on public.drawing_words;
create policy "Admins manage drawing words" on public.drawing_words
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

grant select on public.drawing_words to anon, authenticated;
grant insert, update, delete on public.drawing_words to authenticated;

-- ── seed: initial bilingual drawing words ───────────────────────────
insert into public.drawing_words (word_ar, word_en, category_ar, category_en, display_order) values
  ('قطة', 'Cat', 'حيوانات', 'Animals', 0),
  ('كلب', 'Dog', 'حيوانات', 'Animals', 1),
  ('سمكة', 'Fish', 'حيوانات', 'Animals', 2),
  ('عصفور', 'Bird', 'حيوانات', 'Animals', 3),
  ('فيل', 'Elephant', 'حيوانات', 'Animals', 4),
  ('أسد', 'Lion', 'حيوانات', 'Animals', 5),
  ('جمل', 'Camel', 'حيوانات', 'Animals', 6),
  ('حصان', 'Horse', 'حيوانات', 'Animals', 7),
  ('أرنب', 'Rabbit', 'حيوانات', 'Animals', 8),
  ('ثعبان', 'Snake', 'حيوانات', 'Animals', 9),
  ('فراشة', 'Butterfly', 'حيوانات', 'Animals', 10),
  ('سلحفاة', 'Turtle', 'حيوانات', 'Animals', 11),
  ('شمس', 'Sun', 'طبيعة', 'Nature', 12),
  ('قمر', 'Moon', 'طبيعة', 'Nature', 13),
  ('نجمة', 'Star', 'طبيعة', 'Nature', 14),
  ('سحابة', 'Cloud', 'طبيعة', 'Nature', 15),
  ('شجرة', 'Tree', 'طبيعة', 'Nature', 16),
  ('وردة', 'Flower', 'طبيعة', 'Nature', 17),
  ('جبل', 'Mountain', 'طبيعة', 'Nature', 18),
  ('قوس قزح', 'Rainbow', 'طبيعة', 'Nature', 19),
  ('نخلة', 'Palm tree', 'طبيعة', 'Nature', 20),
  ('نار', 'Fire', 'طبيعة', 'Nature', 21),
  ('سيارة', 'Car', 'مواصلات', 'Transport', 22),
  ('قارب', 'Boat', 'مواصلات', 'Transport', 23),
  ('طائرة', 'Airplane', 'مواصلات', 'Transport', 24),
  ('دراجة', 'Bicycle', 'مواصلات', 'Transport', 25),
  ('قطار', 'Train', 'مواصلات', 'Transport', 26),
  ('صاروخ', 'Rocket', 'مواصلات', 'Transport', 27),
  ('حافلة', 'Bus', 'مواصلات', 'Transport', 28),
  ('بيت', 'House', 'أشياء', 'Objects', 29),
  ('مفتاح', 'Key', 'أشياء', 'Objects', 30),
  ('كتاب', 'Book', 'أشياء', 'Objects', 31),
  ('ساعة', 'Clock', 'أشياء', 'Objects', 32),
  ('كرسي', 'Chair', 'أشياء', 'Objects', 33),
  ('كوب', 'Cup', 'أشياء', 'Objects', 34),
  ('نظارة', 'Glasses', 'أشياء', 'Objects', 35),
  ('مظلة', 'Umbrella', 'أشياء', 'Objects', 36),
  ('بالون', 'Balloon', 'أشياء', 'Objects', 37),
  ('هدية', 'Gift', 'أشياء', 'Objects', 38),
  ('كاميرا', 'Camera', 'أشياء', 'Objects', 39),
  ('مصباح', 'Lamp', 'أشياء', 'Objects', 40),
  ('سلّم', 'Ladder', 'أشياء', 'Objects', 41),
  ('تاج', 'Crown', 'أشياء', 'Objects', 42),
  ('سيف', 'Sword', 'أشياء', 'Objects', 43),
  ('مرساة', 'Anchor', 'أشياء', 'Objects', 44),
  ('قبعة', 'Hat', 'أشياء', 'Objects', 45),
  ('مقص', 'Scissors', 'أشياء', 'Objects', 46),
  ('بيتزا', 'Pizza', 'طعام', 'Food', 47),
  ('موز', 'Banana', 'طعام', 'Food', 48),
  ('تفاحة', 'Apple', 'طعام', 'Food', 49),
  ('آيس كريم', 'Ice cream', 'طعام', 'Food', 50),
  ('كعكة', 'Cake', 'طعام', 'Food', 51),
  ('بيضة', 'Egg', 'طعام', 'Food', 52),
  ('خبز', 'Bread', 'طعام', 'Food', 53),
  ('جزرة', 'Carrot', 'طعام', 'Food', 54),
  ('روبوت', 'Robot', 'مرح', 'Fun', 55),
  ('شبح', 'Ghost', 'مرح', 'Fun', 56),
  ('رجل الثلج', 'Snowman', 'مرح', 'Fun', 57),
  ('جيتار', 'Guitar', 'مرح', 'Fun', 58),
  ('طبلة', 'Drum', 'مرح', 'Fun', 59);
