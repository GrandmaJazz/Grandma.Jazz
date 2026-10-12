import { BRICK_FRAME } from '@shared/family-original/brickArtwork';

export type Point = readonly [number, number];
export const BRICK_PERSPECTIVE = 1100;
// The original solid outer path, before the white frame's interior cutout.
const outline = BRICK_FRAME.match(/<g fill="#000"><path d="([^"]+)" transform="translate\(([^,]+),([^)]+)\)"/)!;
export const BRICK_BODY = { path:outline[1], x:Number(outline[2]), y:Number(outline[3]) };

export function convexHull(points: readonly Point[]): Point[] {
  const sorted=[...points].sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
  const cross=(a:Point,b:Point,c:Point)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
  const half=(items:Point[])=>{
    const hull:Point[]=[];
    for(const p of items){while(hull.length>1&&cross(hull[hull.length-2],hull[hull.length-1],p)<=0)hull.pop();hull.push(p);}
    return hull.slice(0,-1);
  };
  return [...half(sorted),...half([...sorted].reverse())];
}

// One filled silhouette of the entire solid, behind the unchanged SVG faces.
// No independently composited side panels: the corners cannot develop seams.
export function projectBrickDepth(contour: readonly Point[], angle:number, width:number, halfDepth:number): string {
  const scale=width/5000, radians=angle*Math.PI/180;
  const cos=Math.cos(radians),sin=Math.sin(radians);
  const projected:Point[]=[];
  for(const depth of [-halfDepth,halfDepth])for(const [x,y] of contour){
    const dx=(x-2500)*scale,dy=(y-815)*scale;
    const z=-dx*sin+depth*cos;
    const perspective=BRICK_PERSPECTIVE/(BRICK_PERSPECTIVE-z);
    projected.push([2500+(dx*cos+depth*sin)*perspective/scale,815+dy*perspective/scale]);
  }
  return convexHull(projected).map(([x,y],i)=>`${i?'L':'M'}${x.toFixed(3)} ${y.toFixed(3)}`).join(' ')+' Z';
}
