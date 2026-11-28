/** One-shot idle timer for the first fully presented personal brick. */
export function bindFamilyIdleArrival(doc: Document, view: Window, arrive: () => boolean, idleMs = 4200) {
  let timer: number | undefined, disposed = false, fired = false, blurred = false;
  const pointers = new Set<number>();
  let touches = 0;
  const clear = () => { if (timer !== undefined) view.clearTimeout(timer); timer = undefined; };
  const arm = () => {
    clear();
    if (disposed || fired || blurred || doc.hidden || pointers.size || touches) return;
    timer = view.setTimeout(() => {
      timer = undefined;
      if (disposed || fired || blurred || doc.hidden || pointers.size || touches) return;
      fired = arrive();
    }, idleMs);
  };
  const down = (event: PointerEvent) => { pointers.add(event.pointerId); clear(); };
  const up = (event: PointerEvent) => { pointers.delete(event.pointerId); arm(); };
  const touch = (event: TouchEvent) => { touches = event.touches.length; arm(); };
  const visibility = () => {
    if (doc.hidden) { pointers.clear(); touches = 0; clear(); }
    else { blurred = false; arm(); }
  };
  const blur = () => { blurred = true; pointers.clear(); touches = 0; clear(); };
  const focus = () => { blurred = false; arm(); };
  const pointerEvents = [["pointerdown",down],["pointerup",up],["pointercancel",up]] as const;
  for (const [type, handler] of pointerEvents) doc.addEventListener(type,handler,true);
  const touchEvents = ["touchstart","touchmove","touchend","touchcancel"] as const;
  for (const type of touchEvents) doc.addEventListener(type,touch,{capture:true,passive:true});
  const activityEvents = ["click","keydown","keyup","wheel"] as const;
  for (const type of activityEvents) doc.addEventListener(type,arm,true);
  doc.addEventListener("visibilitychange",visibility);
  view.addEventListener("blur",blur);
  view.addEventListener("focus",focus);
  arm();
  return () => {
    disposed = true; clear();
    for (const [type,handler] of pointerEvents) doc.removeEventListener(type,handler,true);
    for (const type of touchEvents) doc.removeEventListener(type,touch,true);
    for (const type of activityEvents) doc.removeEventListener(type,arm,true);
    doc.removeEventListener("visibilitychange",visibility);
    view.removeEventListener("blur",blur);
    view.removeEventListener("focus",focus);
  };
}
