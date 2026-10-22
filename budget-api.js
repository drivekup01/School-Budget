/* Connect to Apps Script only when a caller actually needs it. */
if(!Object.getOwnPropertyDescriptor(window,'budgetRpcReady')){
 let ready;
 Object.defineProperty(window,'budgetRpcReady',{configurable:true,get(){
  if(!ready){ready=(async()=>{
 if(window.google?.script?.run)return(method,...args)=>new Promise((resolve,reject)=>google.script.run.withSuccessHandler(resolve).withFailureHandler(reject)[method](...args));
 const response=await fetch('https://drivekup01.github.io/School-Budget/budget-workbooks.json',{cache:'default'});if(!response.ok)throw Error('โหลดตัวเชื่อมข้อมูลไม่สำเร็จ');const config=await response.json();
 return new Promise((resolve,reject)=>{
  const frame=document.createElement('iframe');frame.hidden=true;frame.id='schoolBudgetBridge';frame.title='ตัวเชื่อมทะเบียนงบประมาณ';let peer,origin;const pending=new Map();let timer=setTimeout(()=>{reject(Error('เชื่อมต่อ Sheet ไม่สำเร็จ กรุณาโหลดใหม่'));frame.remove()},45000);
  window.addEventListener('message',e=>{if(!/^https:\/\/[a-zA-Z0-9-]+\.googleusercontent\.com$/.test(e.origin)||e.data?.channel!=='school-budget')return;
   if(e.data.type==='ready'&&!peer){peer=e.source;origin=e.origin;clearTimeout(timer);resolve((method,...args)=>new Promise((ok,no)=>{const requestId=crypto.randomUUID();const timeout=setTimeout(()=>{pending.delete(requestId);no(Error('การเชื่อมต่อใช้เวลานาน กรุณาโหลดข้อมูลล่าสุดก่อนลองอีกครั้ง'))},45000);pending.set(requestId,{ok,no,timeout});peer.postMessage({channel:'school-budget',requestId,method,args},origin)}));return}
   if(e.source!==peer||e.origin!==origin)return;const item=pending.get(e.data.requestId);if(!item)return;clearTimeout(item.timeout);pending.delete(e.data.requestId);if(e.data.error)item.no(Error(e.data.error));else item.ok(e.data.result);
  });frame.src=config.entryUrl+'?bridge=1';if(document.body)document.body.append(frame);else document.addEventListener('DOMContentLoaded',()=>document.body.append(frame),{once:true});
 });
  })();ready.catch(()=>{});}
  return ready;
 }});
}

// Read the active annual version; only its public summary is returned to this loader.
const budgetYearReads=new Map();
window.fetchBudgetYearData=function(year,options={}){
 const key=year+'|'+!!options.live;if(options.force||options.refresh)budgetYearReads.delete(key);
 if(!budgetYearReads.has(key))budgetYearReads.set(key,readBudgetYear(year,options).catch(e=>{budgetYearReads.delete(key);throw e}));
 return budgetYearReads.get(key);
};
async function readBudgetYear(year,options){
 year=Number(year);if(!Number.isInteger(year)||year<2500||year>2700)throw Error('ปีการศึกษาไม่ถูกต้อง');
 if(!options.live&&[2569,2570].includes(year)){
  const r=await fetch(year===2570?'budget-data-2570.json?v=20261022-speed1':'budget-data.json',{cache:'default'});if(!r.ok)throw Error('โหลดข้อมูลสรุปไม่สำเร็จ');return r.json();
 }
 const rpc=await window.budgetRpcReady,snapshot=await rpc('getBudgetYearSnapshot',year,!!options.force);
 if(snapshot?.status==='empty')return snapshot;
 if(snapshot){window.budgetIsAllocationPlan=false;const h=document.querySelector('#overview header h1');if(h)h.textContent=h.textContent.replace(' (คาดการณ์งบประมาณปี 2570)','');const f=document.querySelector('main footer');if(f)f.textContent=snapshot.status==='sheet-registers'?'ข้อมูลทะเบียนปี '+year+' · บันทึกและอ่านยอดจาก Google Sheets':'ข้อมูลนำเข้าจาก Excel ทั้งปี • เวอร์ชัน '+snapshot.importRevision.slice(0,8);return snapshot;}
 if(![2569,2570].includes(year))return {year,status:'empty',projects:[],departments:[],snapshotDate:''};
 const r=await fetch(window.budgetYear===year&&window.budgetYearDataUrl|| (year===2570?'budget-data-2570.json':'budget-data.json'),{cache:'no-cache'});if(!r.ok)throw Error('โหลดข้อมูลปีงบประมาณไม่สำเร็จ');return r.json();
};

// Store public numeric totals only. Transaction details stay in the register view.
window.rememberBudgetProject=async function(year,state){
 if(Number(year)!==2570)return;
 const key='school-budget-summary-'+year,names=['เงินอุดหนุนรายหัว','เงินกิจกรรมพัฒนาผู้เรียน','เงินรายได้สถานศึกษา','อื่น ๆ'];
 let data;try{data=JSON.parse(localStorage.getItem(key)||'null')?.data;}catch{}
 if(!data)data=JSON.parse(JSON.stringify(await window.fetchBudgetYearData(year)));
 const p=data.projects.find(p=>p.id===state.projectId);if(!p)return;
 p.income=[0,0,0,0];p.remaining=[0,0,0,0];for(const a of p.activities){a.income=[0,0,0,0];a.remaining=[0,0,0,0];}
 const add=(a,i,v)=>a[i]=Math.round((a[i]+v)*100)/100;
 for(const b of state.blocks){const i=names.indexOf(b.budgetType);if(i<0)continue;const received=Math.round((b.ledgerCurrent+b.used)*100)/100;add(p.income,i,received);add(p.remaining,i,b.current);const a=p.activities.find(a=>a.name===b.activity);if(a){add(a.income,i,received);add(a.remaining,i,b.current);}}
 for(const d of data.departments){const ps=data.projects.filter(p=>p.department===d.name);d.income=names.map((_,i)=>Math.round(ps.reduce((s,p)=>s+p.income[i],0)*100)/100);d.remaining=names.map((_,i)=>Math.round(ps.reduce((s,p)=>s+p.remaining[i],0)*100)/100);}
 try{localStorage.setItem(key,JSON.stringify({savedAt:Date.now(),data}));localStorage.setItem('school-budget-change-'+year,JSON.stringify({projectId:state.projectId,at:Date.now()}));}catch{}
};
