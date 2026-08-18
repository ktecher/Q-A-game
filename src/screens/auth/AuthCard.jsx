// The framed cabinet card shared by Sign In, Sign Up, and the post-sign-up
// confirmation. Header row is the Arabic title against a Latin tag, split by a
// hard rule — the same shell on all three screens.
export default function AuthCard({ titleAr, titleEn, children }) {
  return (
    <div className="min-h-screen grid place-items-center px-4 py-10">
      <div
        className="w-full"
        style={{
          maxWidth: 640,
          background: 'var(--panel)',
          border: '4px solid var(--gold-d)',
          boxShadow: '12px 12px 0 var(--shadow)',
          padding: '36px 40px',
        }}
      >
        <div
          className="flex items-baseline justify-between gap-4"
          style={{ borderBottom: '4px solid var(--line)', paddingBottom: 16 }}
        >
          <span
            className="font-ar-body font-extrabold leading-none"
            style={{ fontSize: 'clamp(30px, 6vw, 46px)', color: 'var(--gold-ink)' }}
          >
            {titleAr}
          </span>
          <span
            className="font-en-body leading-none shrink-0"
            style={{ fontSize: 12, color: 'var(--muted)' }}
            lang="en"
          >
            {titleEn}
          </span>
        </div>
        <div style={{ marginTop: 24 }}>{children}</div>
      </div>
    </div>
  );
}
