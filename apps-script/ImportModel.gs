/* Canonical annual import model. All money calculations use integer satang. */
(function(root){
 const funds=['เงินอุดหนุนรายหัว','เงินกิจกรรมพัฒนาผู้เรียน','เงินรายได้สถานศึกษา','อื่น ๆ'];
 const depts=['ฝ่ายบริหารงานวิชาการ','ฝ่ายบริหารงานงบประมาณ','ฝ่ายบริหารงานบุคคล','ฝ่ายบริหารงานทั่วไป'];
 const cents=n=>Math.round(n*100),money=n=>n/100;
 function check(payload,year){
  const issues=[],add=(level,location,message)=>issues.push({level,location,message});
  if(!payload||payload.schema!==1||Number(payload.year)!==Number(year)||![2569,2570].includes(Number(year)))return {issues:[{level:'error',location:'ปีงบประมาณ',message:'รูปแบบหรือปีงบประมาณไม่ถูกต้อง'}],valid:false};
  if(!Array.isArray(payload.units)||!payload.units.length||payload.units.length>2000)return {issues:[{level:'error',location:'ข้อมูล',message:'ต้องมีทะเบียน 1–2,000 ชุด'}],valid:false};
  const ids=new Map(),keys=new Set();let totalEntries=0;
  for(const u of payload.units){
   const loc=String(u.location||'โครงการ '+u.projectId).slice(0,240),key=u.projectId+'|'+u.fund+'|'+u.activity;
   if(!Number.isInteger(u.projectId)||u.projectId<1||u.projectId>9999)add('error',loc,'รหัสโครงการต้องเป็นจำนวนเต็ม 1–9999');
   if(!depts.includes(u.department)||!funds.includes(u.fund))add('error',loc,'ไม่พบจุดอ้างอิงฝ่ายงานหรือประเภทเงิน');
   for(const k of ['projectName','activity','owner'])if(typeof u[k]!=='string'||u[k].length>500||(k==='projectName'&&!u[k].trim()))add('error',loc,'ชื่อโครงการ/กิจกรรม/ผู้รับผิดชอบไม่ถูกต้อง');
   if(keys.has(key))add('error',loc,'โครงการ ประเภทเงิน และกิจกรรมซ้ำ');keys.add(key);
   const identity=u.department+'|'+u.projectName;if(ids.has(u.projectId)&&ids.get(u.projectId)!==identity)add('error',loc,'รหัสโครงการเดียวกันอ้างอิงคนละฝ่ายหรือชื่อ');ids.set(u.projectId,identity);
   for(const k of ['allocated','received','declaredRemaining'])if(typeof u[k]!=='number'||!Number.isFinite(u[k])||Math.abs(u[k])>1e11||Math.abs(u[k]*100-cents(u[k]))>.0001)add('error',loc,'จำนวนเงิน '+k+' ต้องเป็นตัวเลขทศนิยมไม่เกิน 2 ตำแหน่ง');
   if(u.allocated<0||u.received<0)add('error',loc,'ยอดจัดสรรและรายรับต้องไม่ติดลบ');
   if(!Array.isArray(u.entries)||u.entries.length>10000){add('error',loc,'รายการรับ–จ่ายไม่ถูกต้อง');continue;}
   let remaining=cents(u.received),used=0;const entryIds=new Set();totalEntries+=u.entries.length;
   for(const e of u.entries){const where=String(e.location||loc).slice(0,240);
    if(!Number.isFinite(e.spent)||e.spent<=0||Math.abs(e.spent*100-cents(e.spent))>.0001)add('error',where,'ยอดใช้เงินต้องมากกว่า 0 และมีทศนิยมไม่เกิน 2 ตำแหน่ง');
    for(const k of ['number','description','note'])if(typeof e[k]!=='string'||e[k].length>1000||(k!=='note'&&!e[k].trim()))add('error',where,'เลขเอกสารหรือรายละเอียดไม่ครบ');
    if(typeof e.date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(e.date)||(!Number.isFinite(Date.parse(e.date+'T12:00:00Z'))||new Date(e.date+'T12:00:00Z').toISOString().slice(0,10)!==e.date))add('error',where,'วันที่ต้องเป็น ค.ศ. รูปแบบ YYYY-MM-DD');
    const id=e.date+'|'+e.number+'|'+e.description+'|'+e.spent;if(entryIds.has(id))add('warning',where,'พบรายการที่อาจซ้ำกัน');entryIds.add(id);
    remaining-=cents(e.spent);used+=cents(e.spent);
    if(Number.isFinite(e.declaredRemaining)&&cents(e.declaredRemaining)!==remaining)add('warning',where,'ยอดคงเหลือรายแถวไม่ตรง: คำนวณได้ '+money(remaining));
   }
   if(cents(u.declaredRemaining)!==remaining)add('warning',loc,'รายรับ − รายจ่าย ไม่ตรงยอดคงเหลือ: คำนวณได้ '+money(remaining)+' (ระบบจะใช้ยอดคำนวณ)');
   if(remaining<0)add('warning',loc,'ยอดคงเหลือติดลบ');
  }
  if(totalEntries>30000)add('error','ข้อมูล','เกิน 30,000 รายการต่อชุด');
  for(const d of depts)if(!payload.units.some(u=>u.department===d))add('warning',d,'ไม่มีข้อมูลฝ่ายนี้ในชุดทั้งปี');
  if(!Array.isArray(payload.files)||payload.files.length<1||payload.files.length>20||payload.files.some(f=>typeof f!=='string'||f.length>240))add('error','ไฟล์','รายชื่อไฟล์ไม่ถูกต้อง');
  const warnings=payload.sourceWarnings||[];if(!Array.isArray(warnings)||warnings.length>2000)add('error','ไฟล์','คำเตือนมากเกินไป');else for(const w of warnings)add('warning',String(w.location||'Excel').slice(0,240),String(w.message||'ยังตรวจยืนยันไม่ได้').slice(0,500));
  return {valid:!issues.some(x=>x.level==='error'),issues,projects:ids.size,units:payload.units.length,entries:totalEntries,allocated:money(payload.units.reduce((s,u)=>s+cents(u.allocated||0),0)),received:money(payload.units.reduce((s,u)=>s+cents(u.received||0),0))};
 }
 function state(payload,projectId,revision){
  const units=payload.units.filter(u=>u.projectId===Number(projectId));if(!units.length)throw Error('ไม่พบโครงการในข้อมูลปีนี้');
  const loans=payload.borrowing||[];
  const blocks=units.map((u,i)=>{let used=0;const entries=u.entries.map((e,j)=>{used+=cents(e.spent);return Object.assign({},e,{row:j+2,used:money(used),remaining:money(cents(u.received)-used)});});let incoming=0,outgoing=0;
   for(const r of loans){const sign=r.kind==='cancel'?-1:1;if(r.source.projectId===Number(projectId)&&r.source.blockIndex===i)outgoing+=sign*cents(r.amount);if(r.destination.projectId===Number(projectId)&&r.destination.blockIndex===i)incoming+=sign*cents(r.amount);}
   return {headerRow:i+1,blockIndex:i,budgetType:u.fund,activity:u.activity||null,received:u.received,used:money(used),ledgerCurrent:money(cents(u.received)-used),current:money(cents(u.received)-used+incoming-outgoing),incoming:money(incoming),outgoing:money(outgoing),lastRow:entries.length+1,entries};
  });return {year:payload.year,projectId:Number(projectId),sheetName:units[0].projectName,sheetUrl:'',blocks,revision,borrowing:loans.filter(r=>r.source.projectId===Number(projectId)||r.destination.projectId===Number(projectId))};
 }
 function summary(payload,revision){
  const projects=[];for(const id of [...new Set(payload.units.map(u=>u.projectId))]){const units=payload.units.filter(u=>u.projectId===id),p={id,department:units[0].department,name:units[0].projectName,owner:units[0].owner,amounts:[0,0,0,0],income:[0,0,0,0],remaining:[0,0,0,0],activities:[]},s=state(payload,id,revision);
   units.forEach((u,i)=>{const f=funds.indexOf(u.fund);p.amounts[f]+=cents(u.allocated);p.income[f]+=cents(u.received);p.remaining[f]+=cents(s.blocks[i].current);if(u.activity){let a=p.activities.find(a=>a.name===u.activity);if(!a){a={name:u.activity,owner:u.owner,amounts:[0,0,0,0],income:[0,0,0,0],remaining:[0,0,0,0]};p.activities.push(a);}a.amounts[f]+=cents(u.allocated);a.income[f]+=cents(u.received);a.remaining[f]+=cents(s.blocks[i].current);}});
   for(const x of [p,...p.activities])for(const k of ['amounts','income','remaining'])x[k]=x[k].map(money);projects.push(p);}
  const departments=depts.map(name=>({name,complete:true,income:funds.map((_,i)=>money(projects.filter(p=>p.department===name).reduce((s,p)=>s+cents(p.income[i]),0))),remaining:funds.map((_,i)=>money(projects.filter(p=>p.department===name).reduce((s,p)=>s+cents(p.remaining[i]),0)))}));
  return {year:payload.year,status:'imported',source:'Excel นำเข้าทั้งปี',snapshotDate:payload.savedAt?.slice(0,10)||'',importRevision:revision,projects,departments};
 }
 const api={funds,depts,cents,money,check,state,summary};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.BudgetImportModel=api;
})(typeof window==='undefined'?globalThis:window);
