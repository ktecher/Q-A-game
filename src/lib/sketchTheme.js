// Drawing-surface "paper" colours for the Pictionary (sketch) challenge.
// Shared by the host canvas (ChallengeScreen/SketchStage) and the phone canvas
// (src/draw/main.js) so the two surfaces always match — the host's theme,
// carried in the QR, picks which one both screens use.
export const CANVAS_PAPER = {
  light: '#ffffff', // white paper — pairs with dark ink
  dark: '#11182a', // dark paper — pairs with light ink
};
