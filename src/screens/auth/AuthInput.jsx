// Labeled input row used by SignIn/SignUp. Wraps a bilingual Press Start label,
// the field, and an aria-described error span. Four previously hand-coded
// copies (email × 2, password × 2, display name × 1) collapsed into this single
// primitive.
//
// The leading Lucide icon is gone — the arcade theme states the field in its
// label instead, and a 16px glyph fights the pixel grid.
//
// `inputFontClass` / `inputFontSize` let the caller pick Arabic vs Latin
// typography for the value: Press Start has no Arabic coverage, so the
// display-name field switches to Handjet.
export default function AuthInput({
  id,
  type = 'text',
  value,
  onChange,
  placeholder,
  labelAr,
  labelEn,
  error,
  dir = 'ltr',
  lang,
  autoComplete,
  inputFontClass = 'font-en-body',
  inputFontSize = 13,
}) {
  const errorId = `${id}-error`;
  return (
    <label htmlFor={id} className="flex flex-col" style={{ gap: 8 }}>
      <span
        className="font-en-body leading-none"
        style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: '0.1em' }}
      >
        <span lang="en">{labelEn.toUpperCase()} · </span>
        {labelAr}
      </span>
      <input
        id={id}
        type={type}
        dir={dir}
        lang={lang}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        aria-invalid={!!error}
        aria-describedby={error ? errorId : undefined}
        autoComplete={autoComplete}
        className={`w-full ${inputFontClass}`}
        style={{
          background: 'var(--input-bg)',
          border: `4px solid ${error ? 'var(--red)' : 'var(--blue)'}`,
          boxShadow: 'inset 4px 4px 0 var(--inset)',
          padding: '12px 14px',
          color: 'var(--text)',
          fontSize: inputFontSize,
        }}
      />
      {error && (
        <span
          id={errorId}
          role="alert"
          className="font-ar-body font-bold leading-none"
          style={{ fontSize: 24, color: 'var(--red-ink)' }}
        >
          {error}
        </span>
      )}
    </label>
  );
}
