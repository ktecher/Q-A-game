// Bilingual prompts for the Challenge Round (Super Round).
// Format: { ar, en } — both shown on the prompt card.
// Add more anytime — pickRandomPrompt() handles any length.

export const CHALLENGE_PROMPTS = [
  { ar: 'اذكر علامات تجارية للسيارات', en: 'Name car brands' },
  { ar: 'اذكر دولًا في قارة آسيا', en: 'Name countries in Asia' },
  { ar: 'اذكر تمارين رياضية', en: 'Name workout exercises' },
  { ar: 'اذكر حيوانات تبدأ بحرف الألف', en: 'Name animals starting with A' },
  { ar: 'اذكر ألوانًا', en: 'Name colors' },
  { ar: 'اذكر برامج كرتونية', en: 'Name cartoon shows' },
  { ar: 'اذكر فرقًا في كرة القدم الأوروبية', en: 'Name European football clubs' },
  { ar: 'اذكر أكلات كويتية', en: 'Name Kuwaiti dishes' },
  { ar: 'اذكر شركات تكنولوجيا', en: 'Name tech companies' },
  { ar: 'اذكر عواصم عربية', en: 'Name Arab capital cities' },
  { ar: 'اذكر سورًا من القرآن الكريم', en: 'Name surahs of the Quran' },
  { ar: 'اذكر آلات موسيقية', en: 'Name musical instruments' },
  { ar: 'اذكر فواكه', en: 'Name fruits' },
  { ar: 'اذكر خضروات', en: 'Name vegetables' },
  { ar: 'اذكر دول الخليج العربي ودول الجوار', en: 'Name Gulf countries and their neighbors' },
  { ar: 'اذكر لاعبين فازوا بالكرة الذهبية', en: 'Name Ballon d\'Or winners' },
  { ar: 'اذكر شخصيات ديزني', en: 'Name Disney characters' },
  { ar: 'اذكر شركات طيران', en: 'Name airlines' },
  { ar: 'اذكر فنانين أو مغنيين خليجيين', en: 'Name Khaleeji singers or artists' },
  { ar: 'اذكر أنواع مشروبات قهوة', en: 'Name types of coffee drinks' },
  { ar: 'اذكر ألعاب فيديو شهيرة', en: 'Name famous video games' },
  { ar: 'اذكر تطبيقات أو برامج تواصل اجتماعي', en: 'Name social-media apps' },
  { ar: 'اذكر أنبياء مذكورين في القرآن', en: 'Name prophets mentioned in the Quran' },
  { ar: 'اذكر أفلام أبطالها سوبر هيروز', en: 'Name superhero movies' },
  { ar: 'اذكر عملات في العالم', en: 'Name world currencies' },
  { ar: 'اذكر ماركات هواتف ذكية', en: 'Name smartphone brands' },
  { ar: 'اذكر أنواع كرة (رياضات بكرة)', en: 'Name sports played with a ball' },
  { ar: 'اذكر دول استضافت كأس العالم', en: 'Name countries that hosted the World Cup' },
  { ar: 'اذكر مشاهير من السبعينيات والثمانينيات', en: 'Name celebrities from the 70s and 80s' },
  { ar: 'اذكر أنواع توابل أو بهارات', en: 'Name spices' },
  { ar: 'اذكر شخصيات في مسلسل أو فيلم عربي', en: 'Name characters from an Arab show or film' },
  { ar: 'اذكر طيورًا', en: 'Name birds' },
];

export function pickRandomPrompt() {
  return CHALLENGE_PROMPTS[Math.floor(Math.random() * CHALLENGE_PROMPTS.length)];
}
