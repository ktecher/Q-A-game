import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../contexts/GameContext';
import Modal from './Modal';

/**
 * Exit-game button + confirmation modal.
 * Mid-game state is reset only after the user confirms, so accidental clicks
 * don't lose progress. Esc closes the dialog without resetting.
 */
export default function ExitGameButton({ variant = 'icon' }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { reset, state, totalCells } = useGame();

  const exitTo = (path) => {
    reset();
    setOpen(false);
    navigate(path, { replace: true });
  };

  const playedCount = state.picked.size;

  return (
    <>
      {variant === 'icon' ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Exit game"
          className="font-en-body flex items-center justify-center"
          style={{
            width: 44,
            height: 44,
            background: 'var(--panel2)',
            border: '4px solid var(--red)',
            color: 'var(--red)',
            fontSize: 16,
          }}
          title="إنهاء اللعبة · Exit Game"
        >
          <span aria-hidden="true">✕</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="font-en-body leading-none shrink-0"
          style={{ fontSize: 11, color: 'var(--red)' }}
          title="إنهاء اللعبة · Exit Game"
          lang="en"
        >
          <span aria-hidden="true">✕ </span>EXIT
        </button>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        labelledBy="exit-game-title"
        className="max-w-md w-full text-center"
        style={{ padding: '28px 32px', borderColor: 'var(--red)' }}
      >
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Cancel"
          className="absolute font-en-body leading-none"
          style={{ top: 10, insetInlineEnd: 12, fontSize: 12, color: 'var(--red)' }}
        >
          <span aria-hidden="true">✕</span>
        </button>

        <span
          className="inline-block animate-flash"
          style={{ width: 36, height: 36, background: 'var(--red)', border: '4px solid var(--outline)' }}
          aria-hidden="true"
        />

        <h3
          id="exit-game-title"
          className="font-ar-body font-extrabold leading-none"
          style={{ fontSize: 34, color: 'var(--gold-ink)', marginTop: 16 }}
        >
          إنهاء اللعبة الحالية؟
        </h3>
        <p
          className="font-en-body leading-none"
          style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: '0.12em', marginTop: 10 }}
          lang="en"
        >
          EXIT CURRENT GAME?
        </p>

        <p
          className="font-ar-body font-bold leading-none"
          style={{ fontSize: 26, color: 'var(--text)', marginTop: 20 }}
        >
          ستفقد التقدم الحالي ({playedCount} من {totalCells} أسئلة).
        </p>
        <p
          className="font-en-body"
          style={{ fontSize: 9, color: 'var(--muted2)', lineHeight: 1.8, marginTop: 8 }}
          lang="en"
        >
          YOU&apos;LL LOSE {playedCount} OF {totalCells} ANSWERED
        </p>

        <div className="flex flex-col" style={{ gap: 12, marginTop: 26 }}>
          <button
            type="button"
            onClick={() => exitTo('/setup')}
            className="w-full text-center transition-transform duration-100 hover:-translate-y-[3px] active:translate-y-[3px]"
            style={{
              padding: 14,
              background: 'linear-gradient(var(--gold) 50%, var(--gold-d) 50%)',
              border: '4px solid var(--outline)',
              boxShadow: '0 8px 0 var(--gold-sh)',
              color: 'var(--outline)',
            }}
          >
            <span className="font-ar-body font-extrabold leading-none" style={{ fontSize: 30 }}>
              إعداد لعبة جديدة
            </span>{' '}
            <span className="font-en-body leading-none" style={{ fontSize: 10 }} lang="en">
              NEW GAME
            </span>
          </button>
          <button
            type="button"
            onClick={() => exitTo('/home')}
            className="w-full text-center transition-transform duration-100 hover:-translate-y-[3px] active:translate-y-[3px]"
            style={{
              padding: 14,
              background: 'var(--panel2)',
              border: '4px solid var(--blue)',
              boxShadow: '0 8px 0 var(--shadow)',
              color: 'var(--text)',
            }}
          >
            <span className="font-ar-body font-bold leading-none" style={{ fontSize: 28 }}>
              العودة للرئيسية
            </span>{' '}
            <span
              className="font-en-body leading-none"
              style={{ fontSize: 10, color: 'var(--muted)' }}
              lang="en"
            >
              HOME
            </span>
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="font-en-body leading-none"
            style={{ fontSize: 10, color: 'var(--muted2)', letterSpacing: '0.08em', marginTop: 4 }}
            lang="en"
          >
            CANCEL — KEEP PLAYING
          </button>
        </div>
      </Modal>
    </>
  );
}
