import { QRCode } from 'react-qr-code';
import Modal from '../../components/Modal';

// A QR encoding http://localhost:5173/... scans fine, but "localhost" on the
// SCANNING PHONE means the phone itself — it looks for a dev server on the
// handset, finds nothing, and the scan silently does nothing. No error, no
// clue why. Guard is a plain hostname check (never true on a real deploy,
// where origin is a public domain) — no build-flag machinery needed.
const UNREACHABLE_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

// The QR, join code and Arabic instruction — shared by the full-screen
// overlay below AND the lobby table (TrickArea), which needs the same block
// bigger and pinned in the centre instead of behind a menu. Single source
// for the join URL and QR colours (same as QuestionScreen/index.jsx:344).
// `titleId` is only set by the overlay, for its Modal's aria-labelledby —
// left unset in the lobby so two simultaneous instances never collide on id.
export function JoinQrPanel({ joinCode, size = 140, titleId }) {
  const url = `${window.location.origin}/kout/seat#${joinCode}`;
  const unreachable = UNREACHABLE_HOSTS.has(window.location.hostname);

  return (
    <div className="flex flex-col items-center gap-4">
      {unreachable && (
        <div
          className="flex flex-col items-center text-center"
          style={{ background: 'var(--red-p)', border: '4px solid var(--red)', padding: '10px 14px', maxWidth: 260 }}
        >
          <span className="font-ar-body font-extrabold leading-none" style={{ fontSize: 16, color: 'var(--red-ink)' }}>
            هواتف اللاعبين لا تصل لهذا العنوان
          </span>
          <span className="font-en-body leading-none" style={{ fontSize: 9, color: 'var(--red-ink)', marginTop: 6 }} lang="en">
            OPEN THIS APP AT YOUR COMPUTER&apos;S NETWORK ADDRESS, NOT LOCALHOST
          </span>
        </div>
      )}

      <div style={{ background: '#F4ECD8', border: '4px solid var(--outline)', padding: 12 }}>
        <QRCode value={url} size={size} bgColor="#F4ECD8" fgColor="#070A12" level="M" />
      </div>

      <span
        className="font-en-body font-bold leading-none"
        style={{ fontSize: 34, letterSpacing: '0.2em', color: 'var(--gold-ink)' }}
        lang="en"
      >
        {joinCode}
      </span>

      <span id={titleId} className="font-ar-body font-bold leading-none" style={{ fontSize: 16, color: 'var(--text)' }}>
        امسح الرمز للانضمام
      </span>
    </div>
  );
}

/* Full-screen overlay — never pinned on the table strip once a trick is on
   the table, 390px of height cannot spare it there. Reachable mid-game from
   the host menu too: a player whose phone died needs to re-scan, and
   claimSeat allows reclaiming a seat in any status. */
export default function JoinQr({ joinCode, onClose }) {
  return (
    <Modal
      open
      onClose={onClose}
      labelledBy="kout-qr-title"
      className="flex flex-col items-center gap-4"
      style={{ background: 'none', border: 'none', boxShadow: 'none' }}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="إغلاق"
        className="font-en-body leading-none"
        style={{ position: 'fixed', top: 12, insetInlineEnd: 16, fontSize: 14, color: 'var(--red-ink)' }}
      >
        <span aria-hidden="true">✕</span> <span lang="en">CLOSE</span>
      </button>

      <JoinQrPanel joinCode={joinCode} titleId="kout-qr-title" />
    </Modal>
  );
}
