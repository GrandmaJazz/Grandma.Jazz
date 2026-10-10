import { useLayoutEffect, type RefObject } from 'react';
import { TITLES } from '@/family-original/lib/mockData';

// Choose the largest canonical bricks that fit the available scene, including
// every title. The editor shares this scene without reserving an empty row.
export function useBrickSceneLayout(scene: RefObject<HTMLDivElement | null>, bottom: RefObject<HTMLDivElement | null>) {
  useLayoutEffect(() => {
    const element = scene.current, controls = bottom.current;
    if (!element || !controls) return;
    const measure = () => {
      const { width, height } = element.getBoundingClientRect();
      if (!width || !height) return;
      const ratio = 5000 / 1630;
      const gap = height < 360 ? 4 : Math.max(8, Math.min(18, height * .025));
      let best = { columns: 7, width: 0, height: 0 };
      for (let columns = 2; columns <= 7; columns++) {
        const rows = Math.ceil(TITLES.length / columns);
        const rowHeight = (height - (rows - 1) * gap) / rows;
        if (rowHeight < 44) continue;
        const brickWidth = Math.min((width - (columns - 1) * gap) / columns, rowHeight * ratio);
        const gridHeight = rows * Math.max(44, brickWidth / ratio) + (rows - 1) * gap;
        if (brickWidth > best.width) best = { columns, width: brickWidth, height: gridHeight };
      }
      const gridWidth = best.columns * best.width + (best.columns - 1) * gap;
      const editorSpace = Math.max(24, height - controls.offsetHeight - 12);
      const editorWidth = Math.min(width, 720, editorSpace * ratio);
      const properties = {
        '--choice-columns': best.columns,
        '--choice-gap': `${gap}px`,
        '--choice-grid-width': `${gridWidth}px`,
        '--choice-rest-offset': `${Math.max(0, (height - best.height) / 2)}px`,
        '--editor-width': `${editorWidth}px`,
        '--editor-top': `${Math.max(0, (editorSpace - editorWidth / ratio) / 2)}px`,
      };
      for (const [key, value] of Object.entries(properties)) element.style.setProperty(key, String(value));
      const remainder = TITLES.length % best.columns;
      const rowShift = (best.columns - remainder) * (best.width + gap) / 2;
      element.querySelectorAll<HTMLElement>('[data-title]').forEach((button, index) => {
        button.style.setProperty('--choice-row-shift', `${remainder && index >= TITLES.length - remainder ? rowShift : 0}px`);
      });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    observer.observe(controls);
    return () => observer.disconnect();
  }, [scene, bottom]);
}
