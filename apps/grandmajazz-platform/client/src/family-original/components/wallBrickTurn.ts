import { brickSvg } from "@shared/family-original/brickArtwork";
import { joinedMonthLabel } from "@shared/family-original/memberDates";
import { BRICK_EDGE_CONTOUR } from "./brick-experience/brickEdgeContour";
import { projectBrickDepth } from "./brick-experience/brickDepth";

export interface WallBrickTurn { flip: () => void; destroy: () => void }

/** The same closed, rounded solid as the personal brick, at wall size. */
export function createWallBrickTurn(node: HTMLElement, member: {title: string; name: string; joinedMonth?: string | null}, frameUrl: string, reduced: () => boolean): WallBrickTurn {
  const date = joinedMonthLabel(member.joinedMonth);
  const frontArt = node.firstElementChild!;
  const rotor = document.createElement("div"); rotor.className = "family-wall-rotor";
  const front = document.createElement("div"); front.className = "family-wall-face family-wall-front";
  front.append(frontArt);
  const back = document.createElement("div"); back.className = "family-wall-face family-wall-back";
  back.innerHTML = brickSvg("joined the family", date.toLowerCase(), frameUrl);
  for (const text of Array.from(back.querySelectorAll("text"))) {
    text.setAttribute("fill", "#B49B73");
    text.setAttribute("font-size", "280");
    text.setAttribute("letter-spacing", "18");
    // The smaller reverse copy fits naturally; keep its letters unstretched.
    const line = text.parentElement;
    if (line) line.setAttribute("transform", (line.getAttribute("transform") || "").replace(/ scale\([^)]*\)/, ""));
  }
  rotor.append(front, back);
  const shell = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  shell.setAttribute("viewBox", "0 0 5000 1630"); shell.classList.add("family-wall-depth");
  shell.setAttribute("aria-hidden", "true");
  const path = document.createElementNS(shell.namespaceURI, "path"); path.setAttribute("fill", "#fff"); shell.append(path);
  front.setAttribute("aria-hidden", "true"); back.setAttribute("aria-hidden", "true");
  node.replaceChildren(shell, rotor); node.classList.add("family-wall-turning");
  let angle = 0, target = 0, frame = 0, returnTimer = 0;
  const paint = (value: number) => {
    angle = value; rotor.style.transform = `rotateY(${value}deg)`;
    path.setAttribute("d", projectBrickDepth(BRICK_EDGE_CONTOUR, value, 240, 4));
  };
  paint(0);
  const turnTo = (destination: number) => {
      cancelAnimationFrame(frame);
      clearTimeout(returnTimer);
      target = destination;
      node.setAttribute("aria-label", target ? `${member.title} ${member.name}. Joined the family — ${date}. Turn to the front.` : `${member.title} ${member.name}. Turn to see when they joined.`);
      if (target === 180) returnTimer = window.setTimeout(() => turnTo(0), (reduced() ? 0 : 600) + 2500);
      if (reduced()) { paint(target); return; }
      const from = angle, start = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / 600);
        const ease = t * t * t * (t * (6 * t - 15) + 10);
        paint(from + (target - from) * ease);
        if (t < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
  };
  return {
    flip() { turnTo(target === 0 ? 180 : 0); },
    destroy() { cancelAnimationFrame(frame); clearTimeout(returnTimer); node.classList.remove("family-wall-turning"); },
  };
}
