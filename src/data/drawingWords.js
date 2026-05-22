// Word pool for the Pictionary (sketch) challenge. Concrete, drawable nouns —
// the drawer sees one of these on their phone and sketches it for their team.
// Bilingual `ar` / `en`, plus a bilingual category used as a faint on-canvas
// hint (`catAr` / `catEn`) — never the word itself.
//
// OFFLINE FALLBACK ONLY: the Supabase `drawing_words` table (managed in the
// /dashboard "Drawing Words" page) is the source of truth — see useDrawingWords
// in src/lib/queries.js. This local copy is used while that query loads / on error.

export const DRAWING_WORDS = [
  // ── Animals · حيوانات ──
  { ar: 'قطة', en: 'Cat', catAr: 'حيوانات', catEn: 'Animals' },
  { ar: 'كلب', en: 'Dog', catAr: 'حيوانات', catEn: 'Animals' },
  { ar: 'سمكة', en: 'Fish', catAr: 'حيوانات', catEn: 'Animals' },
  { ar: 'عصفور', en: 'Bird', catAr: 'حيوانات', catEn: 'Animals' },
  { ar: 'فيل', en: 'Elephant', catAr: 'حيوانات', catEn: 'Animals' },
  { ar: 'أسد', en: 'Lion', catAr: 'حيوانات', catEn: 'Animals' },
  { ar: 'جمل', en: 'Camel', catAr: 'حيوانات', catEn: 'Animals' },
  { ar: 'حصان', en: 'Horse', catAr: 'حيوانات', catEn: 'Animals' },
  { ar: 'أرنب', en: 'Rabbit', catAr: 'حيوانات', catEn: 'Animals' },
  { ar: 'ثعبان', en: 'Snake', catAr: 'حيوانات', catEn: 'Animals' },
  { ar: 'فراشة', en: 'Butterfly', catAr: 'حيوانات', catEn: 'Animals' },
  { ar: 'سلحفاة', en: 'Turtle', catAr: 'حيوانات', catEn: 'Animals' },

  // ── Nature · طبيعة ──
  { ar: 'شمس', en: 'Sun', catAr: 'طبيعة', catEn: 'Nature' },
  { ar: 'قمر', en: 'Moon', catAr: 'طبيعة', catEn: 'Nature' },
  { ar: 'نجمة', en: 'Star', catAr: 'طبيعة', catEn: 'Nature' },
  { ar: 'سحابة', en: 'Cloud', catAr: 'طبيعة', catEn: 'Nature' },
  { ar: 'شجرة', en: 'Tree', catAr: 'طبيعة', catEn: 'Nature' },
  { ar: 'وردة', en: 'Flower', catAr: 'طبيعة', catEn: 'Nature' },
  { ar: 'جبل', en: 'Mountain', catAr: 'طبيعة', catEn: 'Nature' },
  { ar: 'قوس قزح', en: 'Rainbow', catAr: 'طبيعة', catEn: 'Nature' },
  { ar: 'نخلة', en: 'Palm tree', catAr: 'طبيعة', catEn: 'Nature' },
  { ar: 'نار', en: 'Fire', catAr: 'طبيعة', catEn: 'Nature' },

  // ── Transport · مواصلات ──
  { ar: 'سيارة', en: 'Car', catAr: 'مواصلات', catEn: 'Transport' },
  { ar: 'قارب', en: 'Boat', catAr: 'مواصلات', catEn: 'Transport' },
  { ar: 'طائرة', en: 'Airplane', catAr: 'مواصلات', catEn: 'Transport' },
  { ar: 'دراجة', en: 'Bicycle', catAr: 'مواصلات', catEn: 'Transport' },
  { ar: 'قطار', en: 'Train', catAr: 'مواصلات', catEn: 'Transport' },
  { ar: 'صاروخ', en: 'Rocket', catAr: 'مواصلات', catEn: 'Transport' },
  { ar: 'حافلة', en: 'Bus', catAr: 'مواصلات', catEn: 'Transport' },

  // ── Objects · أشياء ──
  { ar: 'بيت', en: 'House', catAr: 'أشياء', catEn: 'Objects' },
  { ar: 'مفتاح', en: 'Key', catAr: 'أشياء', catEn: 'Objects' },
  { ar: 'كتاب', en: 'Book', catAr: 'أشياء', catEn: 'Objects' },
  { ar: 'ساعة', en: 'Clock', catAr: 'أشياء', catEn: 'Objects' },
  { ar: 'كرسي', en: 'Chair', catAr: 'أشياء', catEn: 'Objects' },
  { ar: 'كوب', en: 'Cup', catAr: 'أشياء', catEn: 'Objects' },
  { ar: 'نظارة', en: 'Glasses', catAr: 'أشياء', catEn: 'Objects' },
  { ar: 'مظلة', en: 'Umbrella', catAr: 'أشياء', catEn: 'Objects' },
  { ar: 'بالون', en: 'Balloon', catAr: 'أشياء', catEn: 'Objects' },
  { ar: 'هدية', en: 'Gift', catAr: 'أشياء', catEn: 'Objects' },
  { ar: 'كاميرا', en: 'Camera', catAr: 'أشياء', catEn: 'Objects' },
  { ar: 'مصباح', en: 'Lamp', catAr: 'أشياء', catEn: 'Objects' },
  { ar: 'سلّم', en: 'Ladder', catAr: 'أشياء', catEn: 'Objects' },
  { ar: 'تاج', en: 'Crown', catAr: 'أشياء', catEn: 'Objects' },
  { ar: 'سيف', en: 'Sword', catAr: 'أشياء', catEn: 'Objects' },
  { ar: 'مرساة', en: 'Anchor', catAr: 'أشياء', catEn: 'Objects' },
  { ar: 'قبعة', en: 'Hat', catAr: 'أشياء', catEn: 'Objects' },
  { ar: 'مقص', en: 'Scissors', catAr: 'أشياء', catEn: 'Objects' },

  // ── Food · طعام ──
  { ar: 'بيتزا', en: 'Pizza', catAr: 'طعام', catEn: 'Food' },
  { ar: 'موز', en: 'Banana', catAr: 'طعام', catEn: 'Food' },
  { ar: 'تفاحة', en: 'Apple', catAr: 'طعام', catEn: 'Food' },
  { ar: 'آيس كريم', en: 'Ice cream', catAr: 'طعام', catEn: 'Food' },
  { ar: 'كعكة', en: 'Cake', catAr: 'طعام', catEn: 'Food' },
  { ar: 'بيضة', en: 'Egg', catAr: 'طعام', catEn: 'Food' },
  { ar: 'خبز', en: 'Bread', catAr: 'طعام', catEn: 'Food' },
  { ar: 'جزرة', en: 'Carrot', catAr: 'طعام', catEn: 'Food' },

  // ── Fun · مرح ──
  { ar: 'روبوت', en: 'Robot', catAr: 'مرح', catEn: 'Fun' },
  { ar: 'شبح', en: 'Ghost', catAr: 'مرح', catEn: 'Fun' },
  { ar: 'رجل الثلج', en: 'Snowman', catAr: 'مرح', catEn: 'Fun' },
  { ar: 'جيتار', en: 'Guitar', catAr: 'مرح', catEn: 'Fun' },
  { ar: 'طبلة', en: 'Drum', catAr: 'مرح', catEn: 'Fun' },
];

/**
 * Pick a random drawable word from a pool, avoiding excluded ones.
 *
 * @param {Array} words — the word pool (from useDrawingWords, DB-backed).
 *   Falls back to the local DRAWING_WORDS when empty or missing.
 * @param {string[]} exclude — `en` values to skip (other sketch rounds this
 *   game) so the same word never comes up twice. Falls back to the full pool
 *   if everything is excluded.
 * @returns {{ar: string, en: string, catAr: string, catEn: string}}
 */
export function pickDrawingWord(words, exclude = []) {
  const source = Array.isArray(words) && words.length > 0 ? words : DRAWING_WORDS;
  const taken = new Set(exclude);
  const pool = source.filter((w) => !taken.has(w.en));
  const list = pool.length > 0 ? pool : source;
  return list[Math.floor(Math.random() * list.length)];
}
