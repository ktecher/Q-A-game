import { AlertCircle } from 'lucide-react';

// Labeled input row used by SignIn/SignUp. Wraps a leading icon, a bilingual
// label, the input, and an aria-described error span. Four previously
// hand-coded copies (email × 2, password × 2, display name × 1) collapsed
// into this single primitive.
//
// `inputFontClass` lets the caller pick Arabic vs English typography for the
// input value (display-name uses font-ar-body; email/password use font-en-body).
export default function AuthInput({
  id,
  type = 'text',
  value,
  onChange,
  placeholder,
  labelAr,
  labelEn,
  icon: Icon,
  error,
  dir,
  lang,
  autoComplete,
  inputFontClass = 'font-en-body text-sm',
}) {
  const errorId = `${id}-error`;
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className="font-ar-ui text-sm text-cream-60 flex items-center gap-1"
      >
        {labelAr} <span className="opacity-60" lang="en">· {labelEn}</span>
      </label>
      <div className="relative">
        <Icon
          size={16}
          className="absolute start-3 top-1/2 -translate-y-1/2 text-cream-45 pointer-events-none"
          aria-hidden="true"
        />
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
          className={`w-full ps-10 pe-3 py-2.5 rounded-lg bg-ink-80 border ${
            error ? 'border-crimson' : 'border-gold-faint'
          } text-cream ${inputFontClass} focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/40 transition`}
        />
      </div>
      {error && (
        <span
          id={errorId}
          role="alert"
          className="text-crimson text-xs font-ar-ui flex items-center gap-1"
        >
          <AlertCircle size={12} aria-hidden="true" /> {error}
        </span>
      )}
    </div>
  );
}
