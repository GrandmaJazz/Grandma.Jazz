import type { PointerEvent } from 'react';
import type { Swiper } from 'swiper';

type GestureSwiper = Swiper & { onTouchStart?: (event: globalThis.PointerEvent) => void };

// Swiper 11 binds this handler when attaching its document-level gesture
// listeners. Reuse it for the surrounding space so momentum, cancellation,
// looping and the cards effect are identical to a swipe on a cover.
export function createAlbumSwipeArea(getSwiper:()=>Swiper|null,isLocked:()=>boolean) {
  return {
    onPointerDown(event:PointerEvent<HTMLDivElement>) {
      if(isLocked()||!event.isPrimary||event.button!==0)return;
      if(event.target instanceof Element&&event.target.closest('.vinyl-swiper'))return;
      const swiper=getSwiper() as GestureSwiper|null;
      if(!swiper||swiper.destroyed)return;
      swiper.onTouchStart?.(event.nativeEvent);
    },
  };
}
