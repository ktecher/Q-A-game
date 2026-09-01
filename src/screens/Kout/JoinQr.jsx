import { QRCode } from 'react-qr-code';
import Modal from '../../components/Modal';

/* Full-screen overlay — never pinned on the table strip, 390px of height
   cannot spare it. Same QR colours as QuestionScreen/index.jsx:344. */
export default function JoinQr({ joinCode, onClose }) {
  const url = `${window.location.origin}/kout/seat#${joinCode}`;

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

      <div style={{ background: '#F4ECD8', border: '4px solid var(--outline)', padding: 12 }}>
        <QRCode value={url} size={140} bgColor="#F4ECD8" fgColor="#070A12" level="M" />
      </div>

      <span
        className="font-en-body font-bold leading-none"
        style={{ fontSize: 34, letterSpacing: '0.2em', color: 'var(--gold-ink)' }}
        lang="en"
      >
        {joinCode}
      </span>

      <span id="kout-qr-title" className="font-ar-body font-bold leading-none" style={{ fontSize: 16, color: 'var(--text)' }}>
        امسح الرمز للانضمام
      </span>
    </Modal>
  );
}
