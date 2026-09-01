// A row of colour swatches where the two callers (quiz TeamCard, Kout
// SetupScreen) both need the same rule: a team can pick any colour, but
// whichever one the OTHER team currently holds is greyed out and unclickable
// — it frees up the moment that team moves elsewhere. Lifted out of
// TeamCard.jsx so Kout doesn't grow a second copy of this logic.
export default function ColorSwatchPicker({ colors, value, otherValue, onChange, size = 22 }) {
  return (
    <div className="flex flex-wrap" style={{ gap: 6 }}>
      {colors.map((hex) => {
        const isMine = value === hex;
        const isTaken = !isMine && otherValue === hex;
        return (
          <button
            key={hex}
            type="button"
            disabled={isTaken}
            aria-label={`اختر اللون ${hex}${isTaken ? ' — مستخدم من الفريق الآخر' : ''}`}
            aria-pressed={isMine}
            title={isTaken ? 'مستخدم من الفريق الآخر · Taken by the other team' : undefined}
            onClick={() => onChange(hex)}
            style={{
              width: size,
              height: size,
              background: hex,
              border: isMine ? '3px solid #F4ECD8' : '3px solid transparent',
              // Greyed rather than hidden: the swatch keeps its place in the
              // row, so the palette does not reflow as colours change hands.
              filter: isTaken ? 'grayscale(1)' : undefined,
              opacity: isTaken ? 0.3 : 1,
              cursor: isTaken ? 'not-allowed' : undefined,
            }}
          />
        );
      })}
    </div>
  );
}
