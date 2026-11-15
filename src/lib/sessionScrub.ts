// Begin as the picture enters the lower part of the screen and finish as
// it leaves the upper part. Using page position also makes reverse natural.
export function sessionScrubTime(frameCenter: number, viewportHeight: number, duration: number) {
  const progress = Math.max(0, Math.min(1, (0.84 - frameCenter / viewportHeight) / 0.68));
  const lastFrame = Math.max(0, Math.ceil(duration * 24) - 1);
  return Math.round(progress * lastFrame) / 24;
}

export function attachSessionScrub(frame: HTMLElement, player: HTMLVideoElement) {
  let raf = 0, visible = false, pending = false;
  const schedule = () => {
    if (!raf && visible && !document.hidden) raf = requestAnimationFrame(sync);
  };
  function sync() {
    raf = 0;
    if (!visible || document.hidden || !pending || player.seeking || !Number.isFinite(player.duration)) return;
    pending = false;
    const { top, height } = frame.getBoundingClientRect();
    const next = sessionScrubTime(top + height / 2, window.innerHeight, player.duration);
    if (Math.abs(player.currentTime - next) >= 1 / 48) player.currentTime = next;
  }
  const update = () => { pending = true; schedule(); };
  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) update();
  });
  observer.observe(frame);
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update, { passive: true });
  player.addEventListener('loadedmetadata', update);
  // Coalesce fast input into the latest scroll position, rather than
  // interrupting a decode with a new seek on every scroll event.
  player.addEventListener('seeked', schedule);
  document.addEventListener('visibilitychange', update);
  return () => {
    cancelAnimationFrame(raf);
    observer.disconnect();
    window.removeEventListener('scroll', update);
    window.removeEventListener('resize', update);
    player.removeEventListener('loadedmetadata', update);
    player.removeEventListener('seeked', schedule);
    document.removeEventListener('visibilitychange', update);
  };
}
