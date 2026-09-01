import { STORAGE_KEYS } from './storageKeys';

// slot 0 = top, increasing slot = counterclockwise (top → upper-left → …).
// `orientation` is the ring slot the host tapped at setup to mean seat 0, so
// every other seat's slot is offset from it. Shared by every screen that
// places something around the table ellipse — SeatRing, TrickArea, and
// SetupScreen's own orientation picker — since this is the one formula all
// three must agree on for the on-screen table to match the physical room.
export function seatAngleDeg(seatIndex, seatCount, orientation) {
  const slot = (orientation + seatIndex) % seatCount;
  return (slot * 360) / seatCount;
}

export function ellipsePct(angleDeg, rx, ry) {
  const rad = (angleDeg * Math.PI) / 180;
  return { left: 50 - rx * Math.sin(rad), top: 50 - ry * Math.cos(rad) };
}

// Reads the orientation slot chosen at Setup (`STORAGE_KEYS.KOUT_SEAT1_POS`).
// TableScreen always knows the game's real seat count and needs the strict
// bound — a stale slot from a bigger past game must not point past this
// table's ring. SetupScreen seeds its own state without passing one, keeping
// the raw value unclamped so toggling the seat-count buttons back and forth
// can recover a slot that's back in range (see its own per-render clamp).
export function readKoutOrientation(seatCount = Infinity) {
  const raw = Number(localStorage.getItem(STORAGE_KEYS.KOUT_SEAT1_POS));
  return Number.isInteger(raw) && raw >= 0 && raw < seatCount ? raw : 0;
}
