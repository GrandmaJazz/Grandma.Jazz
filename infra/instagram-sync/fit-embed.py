from pathlib import Path
import shutil,time
base=Path('/home/Bradfran')
backup=Path('/var/backups')/('grandmajazz-embed-fit-'+str(time.time_ns()));backup.mkdir()
for label,root in [('active',base/'grandmajazz-events'),('staging',base/'grandmajazz-instagram-20261031')]:
 p=root/'client/src/pages/instagram.tsx';shutil.copy2(p,backup/(label+'-instagram.tsx'));s=p.read_text()
 if 'embedScale' not in s:
  s=s.replace('import { useEffect, useState }', 'import { useEffect, useState, type CSSProperties }')
  anchor='  const [gallery, setGallery]'
  assert anchor in s
  s=s.replace(anchor,'''  const fitScale = () => Math.max(0.1, Math.min((window.innerWidth - 10) / 390, (window.innerHeight - 10) / 806));
  const [embedScale, setEmbedScale] = useState(fitScale);
  useEffect(() => {
    if (!embedded) return;
    const resize = () => setEmbedScale(fitScale());
    window.addEventListener("resize", resize);
    resize();
    return () => window.removeEventListener("resize", resize);
  }, [embedded]);
'''+anchor,1)
  anchor='className={`gj-instagram-page${embedded ? " gj-embedded" : ""}`} onClickCapture='
  assert anchor in s
  s=s.replace(anchor, 'className={`gj-instagram-page${embedded ? " gj-embedded" : ""}`} style={embedded ? { "--gj-embed-scale": embedScale } as CSSProperties : undefined} onClickCapture=')
  p.write_text(s)
 p=root/'client/src/pages/instagram.css';shutil.copy2(p,backup/(label+'-instagram.css'));s=p.read_text()
 if 'Scale the native phone' not in s:
  s+='''
/* Scale the native phone and every internal control together in narrow embeds. */
.gj-embedded{position:relative;width:100vw;height:100svh;padding:0!important;min-height:0}
.gj-embedded .gj-gallery-stage{position:relative;display:block;width:100%;height:100%;margin:0;max-width:none}
.gj-embedded .gj-phone{position:absolute;left:50%;top:50%;width:390px;max-width:none;height:806px;min-height:0;margin:0;padding:9px;border-radius:57px;transform:translate(-50%,-50%) scale(var(--gj-embed-scale,1));transform-origin:center center}
.gj-embedded .gj-phone-screen{border-radius:47px}
'''
  p.write_text(s)
shutil.copy2(base/'grandmajazz-events/dist/public/index.html',backup/'index.html')
print(backup)
