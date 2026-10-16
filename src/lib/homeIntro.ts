// This state belongs to the current document, never to browser storage. A new
// visit/reload always starts at the records; client navigation keeps playback.
let completed = false;

export const hasCompletedHomeIntro = () => completed;
export const completeHomeIntro = () => { completed = true; };
export const restartHomeIntro = () => { completed = false; };
