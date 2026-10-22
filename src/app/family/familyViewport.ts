// Safari pans the visual viewport to reveal focused iframe inputs. Feeding
// offsetTop back into the iframe height causes another pan and resize loop.
export function observeFamilyViewport(screen: HTMLElement) {
  const wrapper = document.querySelector('.gj-site-header-wrap');
  let headerHeight = window.innerWidth < 1050 ? 80 : 90;
  let frame = 0;
  const measure = () => {
    frame = 0;
    const header = document.querySelector<HTMLElement>('.gj-header-bar');
    if (header?.offsetHeight) headerHeight = header.offsetHeight;
    const top = headerHeight + 8;
    const height = Math.max(160, Math.round((window.visualViewport?.height ?? window.innerHeight) - top));
    for (const [name, value] of [['--family-top', `${top}px`], ['--family-height', `${height}px`]]) {
      if (screen.style.getPropertyValue(name) !== value) screen.style.setProperty(name, value);
    }
  };
  const schedule = () => { if (!frame) frame = requestAnimationFrame(measure); };
  measure();
  const observer = new ResizeObserver(schedule);
  if (wrapper) observer.observe(wrapper);
  window.addEventListener('resize', schedule);
  window.visualViewport?.addEventListener('resize', schedule);
  // Scroll/pan does not change the available size. Let Safari reveal the input
  // without feeding the changing offset back into the form's geometry.
  return () => {
    observer.disconnect();
    cancelAnimationFrame(frame);
    window.removeEventListener('resize', schedule);
    window.visualViewport?.removeEventListener('resize', schedule);
  };
}
