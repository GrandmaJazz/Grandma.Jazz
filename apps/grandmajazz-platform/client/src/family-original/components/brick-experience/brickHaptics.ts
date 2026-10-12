// Browser vibration is an enhancement; unsupported devices keep the gesture.
export function createBrickHaptics(reduced:()=>boolean, device:Pick<Navigator,'vibrate'>|undefined=typeof navigator==='undefined'?undefined:navigator, now:()=>number=()=>performance.now()) {
  let active=false,startAngle=0,lastAngle=0,lastTick=-Infinity;
  const pulse=(duration:number)=>{
    if(!active||reduced()||typeof device?.vibrate!=='function')return;
    try{device.vibrate(duration);}catch{/* Hardware/browser support is optional. */}
  };
  return {
    begin(angle:number){active=!reduced()&&typeof device?.vibrate==='function';startAngle=angle;lastAngle=angle;lastTick=-Infinity;},
    move(angle:number){
      if(!active||reduced()||Math.abs(angle-lastAngle)<15||now()-lastTick<70)return;
      lastAngle=angle;lastTick=now();
      const progress=Math.abs(angle-startAngle)%180/180;
      pulse(Math.round(4+14*progress));
    },
    end(){pulse(20);active=false;},
    stop(){if(active&&typeof device?.vibrate==='function')try{device.vibrate(0);}catch{}active=false;},
  };
}
