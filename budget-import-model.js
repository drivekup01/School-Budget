/* Annual budget model. Currency is accumulated in integer satang. */
(function(root){
 const funds=['เงินอุดหนุนรายหัว','เงินกิจกรรมพัฒนาผู้เรียน','เงินรายได้สถานศึกษา','อื่น ๆ'],depts=['ฝ่ายบริหารงานวิชาการ','ฝ่ายบริหารงานงบประมาณ','ฝ่ายบริหารงานบุคคล','ฝ่ายบริหารงานทั่วไป'];
 const cents=n=>Math.round(n*100),money=n=>n/100,validYear=y=>Number.isInteger(Number(y))&&Number(y)>=2500&&Number(y)<=2700;
 const numeric=n=>typeof n==='number'&&Number.isFinite(n)&&Math.abs(n)<=1e9&&Math.abs(n*100-cents(n))<.0001;
 const receipt=e=>e.received==null?0:e.received;
 function check(payload,year){
  const issues=[],add=(level,location,message)=>issues.push({level,location:String(location||'ข้อมูล').slice(0,300),message:String(message).slice(0,800)});
  if(!payload||payload.schema!==1||Number(payload.year)!==Number(year)||!validYear(year))return {issues:[{level:'error',location:'ปีการศึกษา',message:'รูปแบบหรือปีไม่ถูกต้อง (2500–2700)'}],valid:false};
  if(!Array.isArray(payload.units)||!payload.units.length||payload.units.length>2000)return {issues:[{level:'error',location:'ข้อมูล',message:'ต้องมีทะเบียน 1–2,000 ชุด'}],valid:false};
  const ids=new Map(),keys=new Set();let totalEntries=0;
  for(const u of payload.units){
   if(!u){add('error','ข้อมูล','ทะเบียนไม่ถูกต้อง');continue;}const loc=u.location||'โครงการ '+u.projectId,key=u.projectId+'|'+(u.registerId||u.fund+'|'+u.activity);
   if(!Number.isInteger(u.projectId)||u.projectId<1||u.projectId>9999)add('error',loc,'รหัสโครงการต้องเป็นจำนวนเต็ม 1–9999');
   if(u.registerId!=null&&(typeof u.registerId!=='string'||u.registerId.length>180))add('error',loc,'รหัสทะเบียนไม่ถูกต้อง');
   if(!depts.includes(u.department)||!funds.includes(u.fund))add('error',loc,'ไม่พบจุดอ้างอิงฝ่ายงานหรือประเภทเงิน กรุณาเลือกประเภทเงินของทะเบียน');
   for(const k of ['projectName','activity','owner'])if(typeof u[k]!=='string'||u[k].length>1000||(k==='projectName'&&!u[k].trim()))add('error',loc,'ชื่อโครงการ/กิจกรรม/ผู้รับผิดชอบไม่ถูกต้อง');
   if(keys.has(key))add('error',loc,'รหัสทะเบียนซ้ำ');keys.add(key);
   const identity=u.department+'|'+u.projectName;if(ids.has(u.projectId)&&ids.get(u.projectId)!==identity)add('error',loc,'รหัสโครงการเดียวกันอ้างอิงคนละฝ่ายหรือชื่อ');ids.set(u.projectId,identity);
   for(const k of ['allocated','received','declaredRemaining'])if(!numeric(u[k]))add('error',loc,'จำนวนเงิน '+k+' ต้องเป็นตัวเลขทศนิยมไม่เกิน 2 ตำแหน่ง');
   if(u.allocated<0||u.received<0)add('error',loc,'ยอดจัดสรรและเงินตั้งต้นต้องไม่ติดลบ');
   if(!Array.isArray(u.entries)||u.entries.length>10000){add('error',loc,'รายการรับ–จ่ายไม่ถูกต้อง');continue;}
   let balance=cents(u.received);const entryIds=new Set();totalEntries+=u.entries.length;
   for(const e of u.entries){
    if(!e){add('error',loc,'รายการไม่ถูกต้อง');continue;}const where=e.location||loc;
    if(!numeric(e.spent)||e.spent<0||!numeric(receipt(e))||receipt(e)<0||(e.spent===0&&receipt(e)===0&&!e.legacy))add('error',where,'ยอดรับเพิ่ม/ใช้เงินต้องเป็นจำนวนเงินไม่ติดลบที่ถูกต้อง');
    for(const k of ['number','description','note'])if(typeof e[k]!=='string'||e[k].length>1000)add('error',where,'ข้อความรายการไม่ถูกต้อง');
    if(!e.number?.trim()||!e.description?.trim())add(e.legacy?'warning':'error',where,'เลขเอกสารหรือคำอธิบายไม่ครบ คงค่าตามต้นฉบับ');
    const validDate=typeof e.date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(e.date)&&Number.isFinite(Date.parse(e.date+'T12:00:00Z'))&&new Date(e.date+'T12:00:00Z').toISOString().slice(0,10)===e.date;
    if(!validDate)add(e.legacy&&e.date===''?'warning':'error',where,'วันที่ไม่ครบหรือไม่ถูกต้อง (ค.ศ. YYYY-MM-DD)');
    const id=e.date+'|'+e.number+'|'+e.description+'|'+e.spent+'|'+receipt(e);if(entryIds.has(id))add('warning',where,'พบรายการที่อาจซ้ำกัน');entryIds.add(id);
    balance+=cents(receipt(e))-cents(e.spent);
    if(Number.isFinite(e.declaredRemaining)&&cents(e.declaredRemaining)!==balance)add('warning',where,'ยอดคงเหลือรายแถวไม่ตรง: ต้นฉบับ '+e.declaredRemaining+' / คำนวณ '+money(balance));
   }
   if(cents(u.declaredRemaining)!==balance)add('warning',loc,'ยอดคงเหลือปลายทะเบียนไม่ตรง: ต้นฉบับ '+u.declaredRemaining+' / คำนวณ '+money(balance)+' (ใช้ยอดคำนวณหลังยืนยัน)');
   if(balance<0)add('warning',loc,'ยอดคงเหลือติดลบ');
  }
  const plans=payload.plans||[];if(!Array.isArray(plans)||plans.length>1000)add('error','แผนโครงการ','รูปแบบแผนโครงการไม่ถูกต้อง');else{
   const seen=new Set();for(const p of plans){if(!p||!Number.isInteger(p.id)||!ids.has(p.id)||seen.has(p.id)||!depts.includes(p.department)||typeof p.name!=='string'||p.name.length>1000){add('error','แผนโครงการ','รหัสหรือจุดอ้างอิงแผนโครงการไม่ถูกต้อง');continue;}seen.add(p.id);if(!Array.isArray(p.activities)||p.activities.length>500){add('error',p.name,'รายการกิจกรรมไม่ถูกต้อง');continue;}
    for(const o of [p,...p.activities]){if(!Array.isArray(o.amounts)||o.amounts.length!==4||o.amounts.some(v=>v!==null&&(!numeric(v)||v<0)))add('error',p.name,'วงเงินแผนต้องมี 4 ประเภทเงินที่ถูกต้อง');if(o!==p&&(typeof o.name!=='string'||!o.name.trim()||o.name.length>1000))add('error',p.name,'ชื่อกิจกรรมไม่ถูกต้อง');}
    const units=payload.units.filter(u=>u.projectId===p.id);if(units.some(u=>u.department!==p.department||u.projectName!==p.name))add('error',p.name,'แผนกับทะเบียนอ้างอิงชื่อหรือฝ่ายไม่ตรงกัน');
   }
  }
  if(totalEntries>30000)add('error','ข้อมูล','เกิน 30,000 รายการต่อชุด');
  for(const d of depts)if(!payload.units.some(u=>u.department===d))add('warning',d,'ไม่มีข้อมูลฝ่ายนี้ในชุดทั้งปี');
  if(!Array.isArray(payload.files)||payload.files.length<1||payload.files.length>20||payload.files.some(f=>typeof f!=='string'||f.length>240))add('error','ไฟล์','รายชื่อไฟล์ไม่ถูกต้อง');
  const warnings=payload.sourceWarnings||[];if(!Array.isArray(warnings)||warnings.length>4000)add('error','ไฟล์','คำเตือนมากเกินไป');else for(const w of warnings)add('warning',w.location||'ไฟล์',w.message||'ยังตรวจยืนยันไม่ได้');
  const allocated=plans.length?plans.reduce((s,p)=>s+p.amounts.reduce((a,v)=>a+cents(v||0),0),0):payload.units.reduce((s,u)=>s+cents(u.allocated||0),0);
  return {valid:!issues.some(x=>x.level==='error'),issues,projects:ids.size,activities:plans.reduce((s,p)=>s+p.activities.length,0),units:payload.units.length,entries:totalEntries,allocated:money(allocated),received:money(payload.units.reduce((s,u)=>s+cents(u.received||0)+u.entries.reduce((a,e)=>a+cents(receipt(e)),0),0))};
 }
 function state(payload,projectId,revision){
  const units=payload.units.filter(u=>u.projectId===Number(projectId));if(!units.length)throw Error('ไม่พบโครงการในข้อมูลปีนี้');const loans=payload.borrowing||[];
  const blocks=units.map((u,i)=>{let used=0,received=cents(u.received);const entries=u.entries.map((e,j)=>{used+=cents(e.spent);received+=cents(receipt(e));return Object.assign({},e,{row:j+2,used:money(used),remaining:money(received-used)});});let incoming=0,outgoing=0;
   for(const r of loans){const sign=r.kind==='cancel'?-1:1;if(r.source.projectId===Number(projectId)&&r.source.blockIndex===i)outgoing+=sign*cents(r.amount);if(r.destination.projectId===Number(projectId)&&r.destination.blockIndex===i)incoming+=sign*cents(r.amount);}
   return {headerRow:i+1,blockIndex:i,registerId:u.registerId||'',sourceLocation:u.location||'',budgetType:u.fund,activity:u.activity||null,received:money(received),opening:u.received,used:money(used),ledgerCurrent:money(received-used),current:money(received-used+incoming-outgoing),incoming:money(incoming),outgoing:money(outgoing),lastRow:entries.length+1,entries};
  });return {year:payload.year,projectId:Number(projectId),sheetName:units[0].projectName,sheetUrl:'',blocks,revision,borrowing:loans.filter(r=>r.source.projectId===Number(projectId)||r.destination.projectId===Number(projectId))};
 }
 function summary(payload,revision){
  const projects=[];for(const id of [...new Set(payload.units.map(u=>u.projectId))]){const units=payload.units.filter(u=>u.projectId===id),plan=(payload.plans||[]).find(p=>p.id===id),p={id,department:units[0].department,name:units[0].projectName,owner:units[0].owner,amounts:[0,0,0,0],income:[0,0,0,0],remaining:[0,0,0,0],activities:[]},s=state(payload,id,revision);
   units.forEach((u,i)=>{const f=funds.indexOf(u.fund);p.amounts[f]+=cents(u.allocated);p.income[f]+=cents(s.blocks[i].received);p.remaining[f]+=cents(s.blocks[i].current);if(u.activity){let a=p.activities.find(a=>a.name===u.activity);if(!a){a={name:u.activity,owner:u.owner,amounts:[0,0,0,0],income:[0,0,0,0],remaining:[0,0,0,0]};p.activities.push(a);}a.amounts[f]+=cents(u.allocated);a.income[f]+=cents(s.blocks[i].received);a.remaining[f]+=cents(s.blocks[i].current);}});
   for(const x of [p,...p.activities])for(const k of ['amounts','income','remaining'])x[k]=x[k].map(money);
   if(plan){p.amounts=plan.amounts.slice();for(const a of plan.activities){let actual=p.activities.find(x=>x.name===a.name);if(actual)actual.amounts=a.amounts.slice();else p.activities.push({name:a.name,owner:a.owner||'',amounts:a.amounts.slice(),income:[null,null,null,null],remaining:[null,null,null,null]});}}
   projects.push(p);}
  const departments=depts.map(name=>({name,complete:true,income:funds.map((_,i)=>money(projects.filter(p=>p.department===name).reduce((s,p)=>s+cents(p.income[i]),0))),remaining:funds.map((_,i)=>money(projects.filter(p=>p.department===name).reduce((s,p)=>s+cents(p.remaining[i]),0)))}));
  return {year:payload.year,status:'imported',source:'ข้อมูลนำเข้าทั้งปี',snapshotDate:payload.savedAt?.slice(0,10)||'',importRevision:revision,projects,departments};
 }
 const api={funds,depts,cents,money,validYear,check,state,summary};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.BudgetImportModel=api;
})(typeof window==='undefined'?globalThis:window);
