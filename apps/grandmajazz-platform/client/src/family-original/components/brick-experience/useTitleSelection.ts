import { useLayoutEffect, useRef, useState, type RefObject } from 'react';

type Stage = 'choosing' | 'entering' | 'editing' | 'returning';

// Move the canonical SVG with a uniform scale; never morph its frame or corners.
export function useTitleSelection(
  host: RefObject<HTMLDivElement | null>,
  choices: RefObject<HTMLDivElement | null>,
  title: string,
  ready: boolean,
  update: (key: 'title', value: string) => void,
) {
  const [stage, setStage] = useState<Stage>(title ? 'editing' : 'choosing');
  const origin = useRef<DOMRect | null>(null);
  const keyboardFocus = useRef<(() => void) | undefined>(undefined);
  const focusAfterCommit = useRef<(() => void) | undefined>(undefined);
  const animation = useRef<Animation | null>(null);
  const busy = useRef(false);

  function choose(value: string, button: HTMLButtonElement, focus?: () => void) {
    if (busy.current || title || !ready) return;
    origin.current = button.getBoundingClientRect();
    keyboardFocus.current = focus;
    busy.current = true;
    setStage('entering');
    update('title', value);
  }

  function change() {
    if (busy.current || !title || !ready) return;
    busy.current = true;
    setStage('returning');
  }

  useLayoutEffect(() => {
    const brick = host.current, grid = choices.current;
    if (!ready || !brick || !grid || (stage !== 'entering' && stage !== 'returning')) return;
    const button = Array.from(grid.querySelectorAll<HTMLButtonElement>('[data-title]')).find(item => item.dataset.title === title);
    if (!button) return;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    // The returning grid's CSS destination is already applied, but its transition
    // may still be in flight. Measure the destination without its transform.
    const target = brick.getBoundingClientRect();
    const gridTransform = getComputedStyle(grid).transform;
    const gridOffset = gridTransform === 'none' ? 0 : new DOMMatrixReadOnly(gridTransform).m42;
    const destinationOffset = stage === 'returning' ? Number.parseFloat(getComputedStyle(grid).getPropertyValue('--choice-rest-offset')) : 0;
    const source = stage === 'entering' ? origin.current! : button.getBoundingClientRect();
    const offsetY = stage === 'returning' ? destinationOffset - gridOffset : 0;
    const small = `translate(${source.left - target.left}px, ${source.top + offsetY - target.top}px) scale(${source.width / target.width})`;
    let finished = false;
    const complete = () => {
      if (finished) return;
      finished = true;
      // Keep the final animation frame until React hides the returning host.
      // Cancelling here exposes the full-size brick for a frame before it hides.
      busy.current = false;
      if (stage === 'returning') {
        update('title', '');
        setStage('choosing');
        focusAfterCommit.current = () => button.focus({ preventScroll: true });
      } else {
        setStage('editing');
        focusAfterCommit.current = keyboardFocus.current;
      }
    };
    const motionChange = () => { if (media.matches) complete(); };
    const resize = () => complete();
    if (media.matches || typeof brick.animate !== 'function') complete();
    else {
      animation.current = brick.animate(
        stage === 'entering' ? [{ transform: small }, { transform: 'none' }] : [{ transform: 'none' }, { transform: small }],
        { duration: 620, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'both' },
      );
      animation.current.onfinish = complete;
    }
    media.addEventListener('change', motionChange);
    window.addEventListener('resize', resize);
    return () => {
      finished = true;
      animation.current?.cancel();
      animation.current = null;
      media.removeEventListener('change', motionChange);
      window.removeEventListener('resize', resize);
    };
  }, [stage, title, ready]);

  useLayoutEffect(() => {
    if (stage !== 'choosing' && stage !== 'editing') return;
    // Inputs and choices are enabled by this commit before focus is restored.
    focusAfterCommit.current?.();
    focusAfterCommit.current = undefined;
  }, [stage]);

  return { stage, choose, change, moving: stage === 'entering' || stage === 'returning' };
}
