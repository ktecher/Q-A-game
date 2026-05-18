// Dev-only "skip auth" button used when Supabase isn't configured locally.
// Identical markup between SignIn and SignUp; only the English label varies.
export default function MockBypassButton({ labelEn, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="btn-outline px-4 py-2 rounded-lg text-xs flex flex-col items-center gap-0.5 mt-1"
    >
      <span>تخطي · وضع تجريبي</span>
      <span className="font-en-body opacity-70" lang="en">
        {labelEn}
      </span>
    </button>
  );
}
