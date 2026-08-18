// Error banner shown below an auth form when submission fails. Identical
// between SignIn and SignUp.
export default function SubmitAlert({ message }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="flex items-center gap-2.5"
      style={{
        background: 'var(--cleared-bg)',
        border: '4px solid var(--red)',
        padding: '10px 14px',
      }}
    >
      <span className="shrink-0" style={{ width: 14, height: 14, background: 'var(--red)' }} />
      <span
        className="font-ar-body font-bold leading-none"
        style={{ fontSize: 24, color: 'var(--red-ink)' }}
      >
        {message}
      </span>
    </div>
  );
}
