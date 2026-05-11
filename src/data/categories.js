// Shared category data — used by Setup (picker), Reveal (slot machine),
// Board (column headers), and (eventually) Question screens.
// Will be replaced by a Supabase-backed query in task #17.

import {
  Landmark, Globe, Trophy, Microscope, BookOpen, Puzzle, Star, Feather,
  Film, Music, UtensilsCrossed, Cpu, PawPrint, Car, UserStar, Sparkles,
  Tv, Gamepad2, Hourglass, Castle, Lightbulb, Languages, MapPin, Medal,
  Goal, Flag, BookMarked, ScrollText, Quote, MessagesSquare,
} from 'lucide-react';

export const ICON_MAP = {
  Landmark, Globe, Trophy, Microscope, BookOpen, Puzzle, Star, Feather,
  Film, Music, UtensilsCrossed, Cpu, PawPrint, Car, UserStar, Sparkles,
  Tv, Gamepad2, Hourglass, Castle, Lightbulb, Languages, MapPin, Medal,
  Goal, Flag, BookMarked, ScrollText, Quote, MessagesSquare,
};

export const CATEGORIES = [
  { slug: 'kuwait-history', ar: 'تاريخ الكويت', en: 'Kuwait History',  icon: 'Landmark',        accent: '#0F2A4D', imageUrl: 'https://upload.wikimedia.org/wikipedia/en/thumb/8/8c/Kuwait_Towers_RB.jpg/500px-Kuwait_Towers_RB.jpg' },
  { slug: 'geography',      ar: 'جغرافيا',      en: 'Geography',       icon: 'Globe',           accent: '#2A5A98', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/85/Theatrum_Orbis_Terrarum%2C_by_Abraham_Ortelius%2C_World%2C_1572.jpg/500px-Theatrum_Orbis_Terrarum%2C_by_Abraham_Ortelius%2C_World%2C_1572.jpg' },
  { slug: 'sports',         ar: 'رياضة',        en: 'Sports',          icon: 'Trophy',          accent: '#9B7434', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/92/Youth-soccer-indiana.jpg/500px-Youth-soccer-indiana.jpg' },
  { slug: 'science',        ar: 'علوم',         en: 'Science',         icon: 'Microscope',      accent: '#A8853B', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Stylised_atom_with_three_Bohr_model_orbits_and_stylised_nucleus.svg/500px-Stylised_atom_with_three_Bohr_model_orbits_and_stylised_nucleus.svg.png' },
  { slug: 'culture',        ar: 'ثقافة',        en: 'Culture',         icon: 'BookOpen',        accent: '#6E1F28', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0b/Morning_Coffee_in_the_Negev_%2813668240%29.jpg/500px-Morning_Coffee_in_the_Negev_%2813668240%29.jpg' },
  { slug: 'riddles',        ar: 'ألغاز',        en: 'Riddles',         icon: 'Puzzle',          accent: '#311548', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/Sphinx_CdM_Paris_DeRidder865_n2.jpg/500px-Sphinx_CdM_Paris_DeRidder865_n2.jpg' },
  { slug: 'religion',       ar: 'دين',          en: 'Religion',        icon: 'Star',            accent: '#0F2A4D', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/89/The_Ka%27ba%2C_Great_Mosque_of_Mecca%2C_Saudi_Arabia_%284%29.jpg/500px-The_Ka%27ba%2C_Great_Mosque_of_Mecca%2C_Saudi_Arabia_%284%29.jpg' },
  { slug: 'literature',     ar: 'أدب',          en: 'Literature',      icon: 'Feather',         accent: '#2A5A98', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/21/Biblioth%C3%A8que_de_l%27Assembl%C3%A9e_Nationale_%28Lunon%29.jpg/500px-Biblioth%C3%A8que_de_l%27Assembl%C3%A9e_Nationale_%28Lunon%29.jpg' },
  { slug: 'cinema',         ar: 'سينما',        en: 'Cinema',          icon: 'Film',            accent: '#9B7434', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ef/Projecteur_cin%C3%A9matographique_35mm.jpg/500px-Projecteur_cin%C3%A9matographique_35mm.jpg' },
  { slug: 'music',          ar: 'موسيقى',      en: 'Music',           icon: 'Music',           accent: '#A8853B', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/The_Sounds_of_Earth_-_GPN-2000-001976.jpg/500px-The_Sounds_of_Earth_-_GPN-2000-001976.jpg' },
  { slug: 'food',           ar: 'طعام',         en: 'Food',            icon: 'UtensilsCrossed', accent: '#6E1F28', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f1/Machboos_%28cropped%29.JPG/500px-Machboos_%28cropped%29.JPG' },
  { slug: 'tech',           ar: 'تكنولوجيا',   en: 'Tech',            icon: 'Cpu',             accent: '#311548', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/79/Dampfturbine_Montage01.jpg/500px-Dampfturbine_Montage01.jpg' },
  { slug: 'animals',        ar: 'حيوانات',     en: 'Animals',         icon: 'PawPrint',        accent: '#0F2A4D', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/020_The_lion_king_Snyggve_in_the_Serengeti_National_Park_Photo_by_Giles_Laurent.jpg/500px-020_The_lion_king_Snyggve_in_the_Serengeti_National_Park_Photo_by_Giles_Laurent.jpg' },
  { slug: 'cars',           ar: 'سيارات',      en: 'Cars',            icon: 'Car',             accent: '#2A5A98', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/12/1925_Ford_Model_T_touring.jpg/500px-1925_Ford_Model_T_touring.jpg' },
  { slug: 'famous-people',  ar: 'مشاهير',      en: 'Famous People',   icon: 'UserStar',        accent: '#9B7434', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7c/Crowd_in_street.jpg/500px-Crowd_in_street.jpg' },
  { slug: 'anime',          ar: 'أنمي',        en: 'Anime',           icon: 'Sparkles',        accent: '#A8853B', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bb/Anime_eye.svg/500px-Anime_eye.svg.png' },
  { slug: 'cartoons',       ar: 'كرتون',       en: 'Cartoons',        icon: 'Tv',              accent: '#6E1F28', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f9/SubstanceandShadow.jpg/500px-SubstanceandShadow.jpg' },
  { slug: 'video-games',    ar: 'ألعاب فيديو', en: 'Video Games',     icon: 'Gamepad2',        accent: '#311548', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b7/Universum_TV_Multispiel_2006.jpg/500px-Universum_TV_Multispiel_2006.jpg' },
  { slug: 'world-history',  ar: 'تاريخ العالم',en: 'World History',   icon: 'Hourglass',       accent: '#0F2A4D', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/The_Great_Wall_of_China_at_Jinshanling-edit.jpg/500px-The_Great_Wall_of_China_at_Jinshanling-edit.jpg' },
  { slug: 'mythology',      ar: 'أساطير',      en: 'Mythology',       icon: 'Castle',          accent: '#2A5A98', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/29/Kylix_Theseus_Aison_MNA_Inv11365_n1.jpg/500px-Kylix_Theseus_Aison_MNA_Inv11365_n1.jpg' },
  { slug: 'inventions',     ar: 'اختراعات',    en: 'Inventions',      icon: 'Lightbulb',       accent: '#9B7434', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b4/Gluehlampe_01_KMJ.png/500px-Gluehlampe_01_KMJ.png' },
  { slug: 'languages',      ar: 'لغات',         en: 'Languages',       icon: 'Languages',       accent: '#A8853B', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Rosetta_Stone.JPG/500px-Rosetta_Stone.JPG' },
  { slug: 'capitals',       ar: 'عواصم',       en: 'Capitals',        icon: 'MapPin',          accent: '#6E1F28', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b2/Skyscrapers_of_Shinjuku_2009_January.jpg/500px-Skyscrapers_of_Shinjuku_2009_January.jpg' },
  { slug: 'olympics',       ar: 'أولمبياد',    en: 'Olympics',        icon: 'Medal',           accent: '#311548', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Olympic_rings_without_rims.svg/500px-Olympic_rings_without_rims.svg.png' },
  { slug: 'football',       ar: 'كرة قدم',     en: 'Football',        icon: 'Goal',            accent: '#0F2A4D', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/42/Football_in_Bloomington%2C_Indiana%2C_1995.jpg/500px-Football_in_Bloomington%2C_Indiana%2C_1995.jpg' },
  { slug: 'f1',             ar: 'فورمولا 1',   en: 'F1',              icon: 'Flag',            accent: '#2A5A98', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/14/2010_Malaysian_GP_opening_lap.jpg/500px-2010_Malaysian_GP_opening_lap.jpg' },
  { slug: 'quran',          ar: 'قرآن',        en: 'Quran',           icon: 'BookMarked',      accent: '#9B7434', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/37/Birmingham_Quran_manuscript_full.jpg/500px-Birmingham_Quran_manuscript_full.jpg' },
  { slug: 'hadith',         ar: 'حديث',        en: 'Hadith',          icon: 'ScrollText',      accent: '#A8853B', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c0/Hadith_Books.jpg/500px-Hadith_Books.jpg' },
  { slug: 'proverbs',       ar: 'أمثال',       en: 'Proverbs',        icon: 'Quote',           accent: '#6E1F28', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/Pieter_Brueghel_the_Elder_-_The_Dutch_Proverbs_-_Google_Art_Project.jpg/500px-Pieter_Brueghel_the_Elder_-_The_Dutch_Proverbs_-_Google_Art_Project.jpg' },
  { slug: 'dialects',       ar: 'لهجات',       en: 'Dialects',        icon: 'MessagesSquare',  accent: '#311548', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/31/Ibn_al-Bawwab_-_Qur%CA%BEan_f._278v-279r.jpg/500px-Ibn_al-Bawwab_-_Qur%CA%BEan_f._278v-279r.jpg' },
];

export function getCategoryBySlug(slug) {
  return CATEGORIES.find((c) => c.slug === slug);
}

// Fallback random pick used when /reveal or /play is hit directly (no game started).
// Fisher–Yates for unbiased shuffling.
export function pickRandomSix() {
  const arr = [...CATEGORIES];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, 6).map((c) => c.slug);
}
