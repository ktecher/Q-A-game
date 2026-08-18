// Dev-only "skip auth" button used when Supabase isn't configured locally.
// Identical markup between SignIn and SignUp; only the English label varies.
export default function MockBypassButton({ labelEn, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2.5 w-full"
      style={{ padding: '10px 12px', background: 'var(--panel2)', border: '4px solid var(--line)' }}
    >
      <span className="shrink-0" style={{ width: 14, height: 14, background: 'var(--line)' }} />
      <span className="font-ar-body font-bold leading-none" style={{ fontSize: 24, color: 'var(--muted)' }}>
        تخطي · وضع تجريبي
      </span>
      <span
        className="font-en-body leading-none"
        style={{ fontSize: 9, color: 'var(--muted2)', marginInlineStart: 'auto' }}
        lang="en"
      >
        {labelEn}
      </span>
    </button>
  );
}
