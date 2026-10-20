import {createServer} from 'node:http';
import {DatabaseSync} from 'node:sqlite';
import {mkdirSync,readFileSync,statSync,createReadStream,writeFileSync,unlinkSync} from 'node:fs';
import {resolve,extname,join} from 'node:path';
import {createHash} from 'node:crypto';
const base='/fundraiser',port=Number(process.env.PORT||3187),data=resolve(process.env.DATA_DIR||'./data'),assets=resolve('dist-vps');
mkdirSync(join(data,'receipts'),{recursive:true,mode:0o700});
const db=new DatabaseSync(join(data,'donations.sqlite'));db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;');
db.exec(`CREATE TABLE IF NOT EXISTS donations(id TEXT PRIMARY KEY,name TEXT NOT NULL,message TEXT NOT NULL,amount INTEGER NOT NULL,currency TEXT NOT NULL,method TEXT NOT NULL,receipt TEXT NOT NULL,receipt_hash TEXT NOT NULL UNIQUE,created_at INTEGER NOT NULL);CREATE INDEX IF NOT EXISTS idx_donations_created ON donations(created_at);`);
const json=(res,status,value)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(value));};
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.jpg':'image/jpeg','.png':'image/png','.mp4':'video/mp4','.woff2':'font/woff2'};
const attempts=new Map();
const server=createServer(async(req,res)=>{
 res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');
 const url=new URL(req.url,'http://localhost');
 if(url.pathname===base){res.writeHead(302,{Location:base+'/'});return res.end();}
 if(url.pathname===base+'/api/progress'){
  if(req.method!=='GET')return json(res,405,{error:'Method not allowed.'});
  try{
   const summary=JSON.parse(readFileSync(join(data,'fundraiser-summary.json'),'utf8'));
   const totals=db.prepare('SELECT currency,SUM(amount) AS amount FROM donations GROUP BY currency').all();
   const addedThb=totals.reduce((sum,row)=>{const added=Math.max(0,Number(row.amount)-Number(summary.includedPublicTotalsMinor[row.currency]||0))/100;return sum+added*(row.currency==='THB'?1:row.currency==='GBP'?summary.gbpToThb:0);},0);
   const raisedThb=Math.round((summary.reportedRaisedThb+addedThb)*100)/100;
   const goalThb=Number(summary.goalThb);
   if(!Number.isFinite(raisedThb)||!Number.isFinite(goalThb)||goalThb<=0)throw Error('Invalid fundraiser summary');
   return json(res,200,{raisedThb,goalThb,percent:Math.round(raisedThb/goalThb*1000)/10,remainingThb:Math.max(0,Math.round((goalThb-raisedThb)*100)/100)});
  }catch(error){console.error('Fundraiser progress unavailable:',error.message);return json(res,503,{error:'Progress is temporarily unavailable.'});}
 }
 if(url.pathname===base+'/api/donations'){
  if(req.method==='GET')return json(res,200,{donations:db.prepare("SELECT id,name,message,amount,currency,created_at,CASE WHEN receipt='' THEN 'unavailable' ELSE 'provided' END AS receipt_status FROM donations ORDER BY created_at DESC LIMIT 100").all(),totals:db.prepare('SELECT currency,SUM(amount) AS amount,COUNT(*) AS count FROM donations GROUP BY currency').all()});
  if(req.method!=='POST')return json(res,405,{error:'Method not allowed.'});
  const allowed=(process.env.PUBLIC_ORIGIN||`http://${req.headers.host}`).split(',');const expected=req.headers.origin;
  if(!allowed.includes(expected))return json(res,403,{error:'Please submit from this website.'});
  const address=process.env.TRUST_PROXY==='true'?String(req.headers['x-real-ip']||req.socket.remoteAddress):req.socket.remoteAddress;
  const now=Date.now();for(const[k,v]of attempts)if(now-v.start>3600000)attempts.delete(k);
  const rate=attempts.get(address)||{start:now,count:0};if(++rate.count>30)return json(res,429,{error:'Too many submissions. Please try again later.'});attempts.set(address,rate);
  const max=6*1024*1024;if(Number(req.headers['content-length']||0)>max)return json(res,413,{error:'Please use a receipt smaller than 5 MB.'});
  try{
   const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>max)return json(res,413,{error:'Please use a receipt smaller than 5 MB.'});chunks.push(chunk);}
   const parsed=new Request(expected+req.url,{method:'POST',headers:{'content-type':req.headers['content-type']||''},body:Buffer.concat(chunks)});const f=await parsed.formData();
   const amount=Number(f.get('amount')),method=String(f.get('method')),currency=method==='monzo'?'GBP':'THB',name=f.get('anonymous')==='true'?'Anonymous':String(f.get('name')||'').trim(),message=String(f.get('message')||'').trim(),file=f.get('receipt'),id=String(f.get('id')||'');
   const withoutReceipt=f.get('receiptUnavailable')==='true',hasReceipt=file instanceof File&&file.size>0;
   if(withoutReceipt&&(f.get('paymentConfirmed')!=='true'||hasReceipt))return json(res,400,{error:'Confirm that payment has already been made, or upload your receipt instead.'});
   if(!/^[a-f0-9-]{36}$/.test(id)||!Number.isFinite(amount)||amount<0.01||amount>10000000||Math.abs(amount*100-Math.round(amount*100))>0.000001||!name||name.length>80||message.length>1000||!['qr','bank','monzo','stripe'].includes(method)||(method==='stripe'&&![50,100,200,300,500,700,1000,1500,2000,2500,3000,4000,5000].includes(amount)&&(amount<500||amount%500!==0))||(!withoutReceipt&&(!hasReceipt||file.size>5*1024*1024||!['image/jpeg','image/png','image/webp'].includes(file.type))))return json(res,400,{error:'Check your amount, name and receipt (JPG, PNG or WebP, up to 5 MB).'});
   if(db.prepare('SELECT id FROM donations WHERE id=?').get(id))return json(res,200,{ok:true});
   if(withoutReceipt){db.prepare('INSERT INTO donations VALUES (?,?,?,?,?,?,?,?,?)').run(id,name,message,Math.round(amount*100),currency,method,'','no-receipt:'+id,Date.now());return json(res,201,{ok:true});}
   const bytes=Buffer.from(await file.arrayBuffer());const valid=(file.type==='image/jpeg'&&bytes[0]===255&&bytes[1]===216)||(file.type==='image/png'&&bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))||(file.type==='image/webp'&&bytes.subarray(0,4).toString()==='RIFF'&&bytes.subarray(8,12).toString()==='WEBP');
   if(!valid)return json(res,400,{error:'Please upload a valid receipt image.'});
   const hash=createHash('sha256').update(bytes).digest('hex');if(db.prepare('SELECT id FROM donations WHERE receipt_hash=?').get(hash))return json(res,409,{error:'This receipt has already been submitted. Check the wall for your donation.'});
   const filename=id+({ 'image/jpeg':'.jpg','image/png':'.png','image/webp':'.webp'}[file.type]);const path=join(data,'receipts',filename);writeFileSync(path,bytes,{flag:'wx',mode:0o600});
   try{db.prepare('INSERT INTO donations VALUES (?,?,?,?,?,?,?,?,?)').run(id,name,message,Math.round(amount*100),currency,method,filename,hash,Date.now());}catch(error){unlinkSync(path);throw error;}
   return json(res,201,{ok:true});
  }catch(error){console.error('Donation submission failed:',error.message);return json(res,503,{error:'We could not save your donation. Your details are still here; please try again.'});}
 }
 if(!['GET','HEAD'].includes(req.method)||!url.pathname.startsWith(base+'/'))return json(res,404,{error:'Not found'});
 let relative;try{relative=decodeURIComponent(url.pathname.slice(base.length+1));}catch{return json(res,400,{error:'Invalid path'});}
 const path=resolve(assets,relative||'index.html');if(!path.startsWith(assets+'/'))return json(res,404,{error:'Not found'});
 try{const stat=statSync(path);if(!stat.isFile())return json(res,404,{error:'Not found'});const headers={'Content-Type':mime[extname(path)]||'application/octet-stream','Cache-Control':relative.startsWith('assets/')?'public, max-age=31536000, immutable':'public, max-age=300','Accept-Ranges':'bytes'};let start=0,end=stat.size-1,status=200;
 const match=/^bytes=(\d+)-(\d*)$/.exec(req.headers.range||'');if(match){start=Number(match[1]);end=match[2]?Math.min(Number(match[2]),end):end;if(start>end){res.writeHead(416,{'Content-Range':`bytes */${stat.size}`});return res.end();}status=206;headers['Content-Range']=`bytes ${start}-${end}/${stat.size}`;}
 headers['Content-Length']=end-start+1;res.writeHead(status,headers);if(req.method==='HEAD')return res.end();createReadStream(path,{start,end}).pipe(res);
 }catch{return json(res,404,{error:'Not found'});}
});
server.listen(port,process.env.HOST||'127.0.0.1',()=>console.log(`Fundraiser ready: http://127.0.0.1:${port}/fundraiser/`));
process.on('SIGTERM',()=>server.close(()=>{db.close();process.exit(0);}));
