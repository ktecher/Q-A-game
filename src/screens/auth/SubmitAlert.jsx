import { AlertCircle } from 'lucide-react';

// Error banner shown below an auth form when submission fails. Identical
// between SignIn and SignUp.
export default function SubmitAlert({ message }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="rounded-lg border border-crimson/40 bg-crimson/10 px-3 py-2.5 text-xs"
    >
      <p className="text-crimson font-ar-ui flex items-start gap-2">
        <AlertCircle size={14} className="flex-shrink-0 mt-0.5" aria-hidden="true" />
        <span>{message}</span>
      </p>
    </div>
  );
}
