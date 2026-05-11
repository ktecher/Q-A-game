// Mock question pool — replaced by Supabase queries in task #17.
// Pattern: { categorySlug: { 200: [...], 400: [...], 600: [...] } }
// Each question: { ar, en, answerAr, answerEn, hintAr, hintEn }

const REAL_QUESTIONS = {
  'kuwait-history': {
    200: [
      {
        ar: 'في أي عام استقلت دولة الكويت؟',
        en: 'In what year did Kuwait gain independence?',
        answerAr: 'عام ١٩٦١',
        answerEn: '1961',
        hintAr: 'بداية عقد الستينات',
        hintEn: 'Early 1960s',
      },
    ],
    400: [
      {
        ar: 'في أي عام تم تأسيس مدينة الكويت؟',
        en: 'In what year was Kuwait City founded?',
        answerAr: 'عام ١٦١٣ ميلادي',
        answerEn: 'The year 1613 AD',
        hintAr: 'في أوائل القرن السابع عشر',
        hintEn: 'Early 17th century',
      },
    ],
    600: [
      {
        ar: 'من هو مؤسس مدرسة المباركية أول مدرسة نظامية في الكويت؟',
        en: 'Who founded Al-Mubarakiya School, the first formal school in Kuwait?',
        answerAr: 'الشيخ يوسف بن عيسى القناعي',
        answerEn: 'Sheikh Yusuf bin Issa Al-Qinai',
        hintAr: 'تأسست عام ١٩١١',
        hintEn: 'Founded in 1911',
      },
    ],
  },
  geography: {
    200: [
      {
        ar: 'ما هي أكبر قارة في العالم؟',
        en: 'What is the largest continent in the world?',
        answerAr: 'آسيا',
        answerEn: 'Asia',
        hintAr: 'تضم أكثر من ٤ مليار نسمة',
        hintEn: 'Home to over 4 billion people',
      },
    ],
    400: [
      {
        ar: 'ما هي أطول سلسلة جبال في العالم؟',
        en: 'What is the longest mountain range in the world?',
        answerAr: 'جبال الأنديز',
        answerEn: 'The Andes',
        hintAr: 'تمتد على طول الساحل الغربي لأمريكا الجنوبية',
        hintEn: 'Runs along western South America',
      },
    ],
    600: [
      {
        ar: 'ما اسم النهر الذي يُعتبر أعمق نهر في العالم؟',
        en: 'Which river is considered the deepest in the world?',
        answerAr: 'نهر الكونغو',
        answerEn: 'The Congo River',
        hintAr: 'يقع في أفريقيا الوسطى',
        hintEn: 'Located in Central Africa',
      },
    ],
  },
  sports: {
    200: [
      {
        ar: 'كم عدد لاعبي فريق كرة القدم في الملعب؟',
        en: 'How many players are on a football (soccer) team on the field?',
        answerAr: '١١ لاعبًا',
        answerEn: '11 players',
        hintAr: 'بما فيهم حارس المرمى',
        hintEn: 'Including the goalkeeper',
      },
    ],
    400: [
      {
        ar: 'في أي عام فاز المنتخب الكويتي بكأس آسيا؟',
        en: 'In what year did Kuwait win the AFC Asian Cup?',
        answerAr: 'عام ١٩٨٠',
        answerEn: '1980',
        hintAr: 'استضافت الكويت البطولة في تلك السنة',
        hintEn: 'Kuwait hosted the tournament that year',
      },
    ],
    600: [
      {
        ar: 'من هو أول رياضي كويتي يحصل على ميدالية أولمبية؟',
        en: 'Who was the first Kuwaiti athlete to win an Olympic medal?',
        answerAr: 'فهيد الديحاني',
        answerEn: 'Fehaid Al-Deehani',
        hintAr: 'في رياضة الرماية ٢٠٠٠ و ٢٠١٢ و ٢٠١٦',
        hintEn: 'Shooting — 2000, 2012, 2016',
      },
    ],
  },
  science: {
    200: [
      {
        ar: 'ما هو الكوكب الأقرب إلى الشمس؟',
        en: 'Which planet is closest to the Sun?',
        answerAr: 'عطارد',
        answerEn: 'Mercury',
        hintAr: 'أصغر كوكب في النظام الشمسي',
        hintEn: 'The smallest planet in the solar system',
      },
    ],
    400: [
      {
        ar: 'ما هو الرمز الكيميائي للذهب؟',
        en: 'What is the chemical symbol for gold?',
        answerAr: 'Au',
        answerEn: 'Au',
        hintAr: 'من الكلمة اللاتينية Aurum',
        hintEn: 'From the Latin word Aurum',
      },
    ],
    600: [
      {
        ar: 'من اكتشف البنسلين؟',
        en: 'Who discovered penicillin?',
        answerAr: 'ألكسندر فلمنغ',
        answerEn: 'Alexander Fleming',
        hintAr: 'عالم اسكتلندي اكتشفه عام ١٩٢٨',
        hintEn: 'Scottish scientist, discovered in 1928',
      },
    ],
  },
  food: {
    200: [
      {
        ar: 'ما هو الطبق الوطني الكويتي الأشهر؟',
        en: 'What is the most famous Kuwaiti national dish?',
        answerAr: 'المجبوس',
        answerEn: 'Machboos',
        hintAr: 'يُحضر بالأرز واللحم أو الدجاج',
        hintEn: 'Made with rice and meat or chicken',
      },
    ],
    400: [
      {
        ar: 'ما هي الحلوى الكويتية التقليدية المصنوعة من الدبس؟',
        en: 'What is the traditional Kuwaiti sweet made with date syrup?',
        answerAr: 'الدرابيل',
        answerEn: 'Darabeel',
        hintAr: 'يُقدم في المناسبات والأعياد',
        hintEn: 'Served at celebrations and holidays',
      },
    ],
    600: [
      {
        ar: 'ما اسم التتبيلة المشهورة في المطبخ الخليجي والمكونة من الفلفل والكزبرة والكمون والقرفة؟',
        en: 'What spice mix common in Gulf cuisine is made of pepper, coriander, cumin and cinnamon?',
        answerAr: 'البهارات',
        answerEn: 'Bahārāt',
        hintAr: 'الكلمة العربية تعني "التوابل"',
        hintEn: 'The Arabic word literally means "spices"',
      },
    ],
  },
};

// Stub generator for categories without hand-written content
function makeStub(category, value, slot = 0) {
  const variant = slot + 1;
  return {
    ar: `سؤال تجريبي #${variant} عن ${category.ar} بقيمة ${value} نقطة`,
    en: `Sample question #${variant} about ${category.en} worth ${value} points`,
    answerAr: 'الإجابة الصحيحة',
    answerEn: 'The correct answer',
    hintAr: 'تلميح تجريبي',
    hintEn: 'Sample hint',
  };
}

/**
 * Get a question for a given category + value + slot.
 * Returns a real bilingual question if available, otherwise a deterministic stub.
 * `slot` is 0 or 1 — distinguishes the two cells per difficulty tier on a board.
 */
export function getQuestion(category, value, slot = 0) {
  const pool = REAL_QUESTIONS[category.slug]?.[value];
  if (pool && pool.length > 0) {
    return pool[slot % pool.length];
  }
  return makeStub(category, value, slot);
}
