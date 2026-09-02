// Every rejection the kout Edge Function (supabase/functions/kout/index.ts)
// can send back, mapped to Arabic — so no Kout screen ever surfaces a raw
// server string (English) to an Arabic-speaking host or player. Lifted out
// of TableScreen's HOST_ERROR_AR and SeatScreen's arabicError once a third
// copy was about to appear in SetupScreen — same reason koutGeometry.js was
// pulled out of SeatRing/TrickArea/SetupScreen.
const KOUT_ERROR_AR = {
  'not signed in': 'تعذّر تسجيل الدخول، أعد فتح الرابط من جديد',
  'seatCount must be 4 or 6': 'عدد المقاعد يجب أن يكون ٤ أو ٦',
  'no such game': 'تعذّر العثور على اللعبة',
  'no such seat': 'لا يوجد هذا المقعد في هذه اللعبة',
  'seat taken': 'هذا المقعد محجوز، اختر مقعدًا آخر',
  'game already started': 'اللعبة بدأت بالفعل',
  // Not a failure — this device is already seated in this game (e.g. a
  // second tab). SeatScreen tries to recover into that seat on its own
  // before ever showing this; it only surfaces if that recovery itself fails.
  'you already hold a seat in this game': 'أنت جالس بالفعل في هذه اللعبة',
  'only the host starts a round': 'هذا الحساب ليس مضيف اللعبة',
  'a round is already in progress': 'الجولة جارية بالفعل',
  'every seat must be claimed': 'يجب أن يشغل كل مقعد لاعب أولاً',
  'every player must be ready': 'يجب أن يضغط الجميع جاهز أولاً',
  'ready must be a boolean': 'حدث خطأ، حاول مرة أخرى',
  'ready only matters before the game starts': 'اللعبة بدأت بالفعل',
  'you hold no seat here': 'لا تملك مقعدًا في هذه اللعبة',
  'not your turn': 'ليس دورك الآن',
  'bid must be 5-9 or pass': 'المزايدة يجب أن تكون بين ٥ و٩ أو الطاف',
  'only the high bidder names hukm': 'صاحب أعلى مزايدة هو من يحدد الحكم',
  'that card is not in your hand': 'هذه الورقة ليست بيدك',
  'illegal play': 'لا يمكنك لعب هذه الورقة',
};

// `not in <status list>` is generated dynamically (atTurn in index.ts) rather
// than as a fixed string, so it needs its own prefix check instead of a map
// entry. Anything else unrecognised — a validation string that can't
// actually be reached from the UI, a network error, a Postgres message that
// slipped through — falls back to the generic line rather than leaking English.
export function arabicKoutError(message) {
  if (KOUT_ERROR_AR[message]) return KOUT_ERROR_AR[message];
  if (message?.startsWith('not in ')) return 'لا يمكنك فعل ذلك الآن، انتظر قليلاً';
  return 'حدث خطأ، حاول مرة أخرى';
}
