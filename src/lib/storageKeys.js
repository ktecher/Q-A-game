// Central registry for every localStorage key the app uses. Every key shares
// the `uah.` prefix (short for "Umm Al Hayman"), which previously lived as
// raw string literals scattered across gameStorage.js, theme.js, deviceId.js,
// and AuthContext.jsx — easy to typo, hard to grep when the prefix needs to
// change (e.g., on a major version bump that invalidates all stored state).
export const STORAGE_KEYS = {
  GAME: 'uah.game_state',
  THEME: 'uah.theme',
  DEVICE_ID: 'uah.device_id',
  GUEST_PROFILE: 'uah.guest_profile',
  SETTINGS: 'uah.settings',
  // Which on-screen ring slot the host tapped at Kout setup to mean "seat 1"
  // — an integer 0..seatCount-1. Written by SetupScreen, read by SeatRing so
  // the ring's counterclockwise layout matches the physical room.
  KOUT_SEAT1_POS: 'uah.kout_seat1_pos',
};
