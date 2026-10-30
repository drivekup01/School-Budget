'use strict';
const crypto=require('node:crypto'),A=require('./allocation-model');
const clone=v=>JSON.parse(JSON.stringify(v));
const stable=v=>JSON.stringify(v&&typeof v==='object'?Array.isArray(v)?v.map(x=>JSON.parse(stable(x))):Object.fromEntries(Object.keys(v).sort().map(k=>[k,JSON.parse(stable(v[k]))])):v);
const hash=v=>crypto.createHash('sha256').update(stable(v)).digest('hex');
const key=(fund,activity)=>fund+'|'+A.clean(activity);
const significant=b=>(b.entries||[]).length>0||!!b.incoming||!!b.outgoing||!!b.additionalReceipts;
function allowed(user){return user.schoolRole?['admin','budget'].includes(user.schoolRole):user.role==='admin'}
function guard(user){if(!allowed(user))throw Object.assign(Error('เฉพาะผู้ดูแลระบบและฝ่ายงบประมาณเท่านั้น'),{code:'permission-denied'})}
function expenses(states){return states.flatMap(s=>s.blocks.flatMap(b=>(b.entries||[]).map(e=>({projectId:s.projectId,entry:e})))).map(stable).sort()}
function assertPreserved(before,after){if(stable(expenses(before))!==stable(expenses(after)))throw Error('หยุดอัปเดต: รายการใช้จ่ายเดิมไม่ครบหรือมีข้อมูลเปลี่ยน');for(const old of before){const current=after.find(s=>s.projectId===old.projectId);if(!current||stable(old.borrowing||[])!==stable(current.borrowing||[]))throw Error('หยุดอัปเดต: ประวัติยืมเงินเดิมเปลี่ยน');}}
function balance(block,opening){
 const additional=A.cents(Number(block.additionalReceipts||0)),spent=(block.entries||[]).reduce((s,e)=>s+A.cents(Number(e.spent||0)),0);
 block.openingBalance=opening;block.received=A.money(A.cents(opening)+additional);block.additionalReceipts=A.money(additional);block.used=A.money(spent);block.ledgerCurrent=A.money(A.cents(block.received)-spent);block.current=A.money(A.cents(block.ledgerCurrent)+A.cents(block.incoming||0)-A.cents(block.outgoing||0));block.allocationRebased=true;
 if(block.current<0)throw Error('รายรับใหม่ไม่เพียงพอกับยอดใช้จ่ายเดิมของโครงการ/กิจกรรมนี้');
 // entries intentionally remain byte-for-byte equivalent; running balances are a read projection.
 return block;
}
function newBlock(p,desired,index,header){return balance({blockIndex:index,headerRow:header,sourceHeaderRow:header,registerId:'P'+p.id+'-ALLOCATION-'+header,budgetType:desired.fund,activity:desired.activity||null,lastRow:header,lastEntryRow:header,noteColumn:7,usedColumn:8,entries:[],incoming:0,outgoing:0,additionalReceipts:0},desired.amount)}
function targets(p){const list=[];for(let f=0;f<4;f++){if(p.activities.length){for(const a of p.activities)if(a.amounts[f]>0)list.push({fund:A.funds[f],activity:a.name,amount:a.amounts[f]});}else if(p.amounts[f]>0)list.push({fund:A.funds[f],activity:'',amount:p.amounts[f]});}if(!list.length)list.push({fund:A.funds[0],activity:'',amount:0});return list;}
function updateProject(p,old){
 const state=old?clone(old):{year:0,projectId:p.id,sheetName:p.name,blocks:[],borrowing:[]};
 state.sheetName=p.name;state.owner=p.owner;state.department=p.department;
 if(p.aggregation){
  if((state.borrowing||[]).length||state.blocks.some(b=>b.incoming||b.outgoing))throw Error('โครงการ 14 มีการยืมเงิน ต้องตรวจจุดอ้างอิงก่อนรวมทะเบียน');
  const entries=state.blocks.flatMap(b=>b.entries||[]),rows=new Set(entries.map(e=>e.row));if(rows.size!==entries.length)throw Error('โครงการ 14 มีเลขแถวรายการซ้ำ ต้องตรวจจุดอ้างอิงก่อนรวมทะเบียน');
  if(state.blocks.some(b=>b.budgetType!==A.funds[0]&&significant(b)))throw Error('โครงการ 14 มีรายการใช้จ่ายต่างประเภทเงิน ต้องตรวจสอบก่อนรวม');
  const base=state.blocks[0]?clone(state.blocks[0]):newBlock(p,{fund:A.funds[0],activity:'',amount:0},0,1);
  base.entries=entries;base.activity=null;base.budgetType=A.funds[0];base.additionalReceipts=A.money(state.blocks.reduce((s,b)=>s+A.cents(Number(b.additionalReceipts||0)),0));base.incoming=0;base.outgoing=0;base.lastRow=Math.max(base.headerRow,...entries.map(e=>Number(e.row)||0));base.lastEntryRow=base.lastRow;
  state.mergedAllocationRegisters=state.blocks.map(b=>({blockIndex:b.blockIndex,headerRow:b.headerRow,registerId:b.registerId||'',activity:b.activity||''}));state.blocks=[balance(base,p.amounts[0])];return state;
 }
 const desired=targets(p),hasHistory=state.blocks.some(significant)||(state.borrowing||[]).length>0;
 if(!hasHistory){let header=Math.max(0,...state.blocks.map(b=>b.headerRow));state.blocks=desired.map((d,i)=>{const oldBlock=state.blocks.find(b=>key(b.budgetType,b.activity)===key(d.fund,d.activity));return oldBlock?balance({...oldBlock,blockIndex:i,activity:d.activity||null},d.amount):newBlock(p,d,i,header+=10);});return state;}
 const remaining=new Map(desired.map(d=>[key(d.fund,d.activity),d]));
 for(const b of state.blocks){const k=key(b.budgetType,b.activity),target=remaining.get(k);if(!target)throw Error('โครงการ '+p.id+' มีทะเบียนเดิมที่ไม่ตรงกับกิจกรรมในไฟล์ ต้องตรวจจุดอ้างอิงก่อนอัปเดต');balance(b,target.amount);b.activity=target.activity||null;remaining.delete(k);}
 if((state.borrowing||[]).length&&remaining.size)throw Error('โครงการ '+p.id+' มีการยืมเงินและโครงสร้างทะเบียนเปลี่ยน ต้องตรวจสอบก่อน');
 let header=Math.max(0,...state.blocks.map(b=>b.headerRow),...state.blocks.flatMap(b=>(b.entries||[]).map(e=>e.row)));
 for(const d of remaining.values()){header+=10;state.blocks.push(newBlock(p,d,state.blocks.length,header));}
 return state;
}
function build(input,oldSummary,oldStates,reference={}){
 const allocation=A.normalize(input),oldIds=new Set(oldSummary?.projects?.map(p=>p.id)||[]),newIds=new Set(allocation.projects.map(p=>p.id));
 for(const id of oldIds)if(!newIds.has(id))throw Error('ไฟล์ไม่มีโครงการเดิมหมายเลข '+id+' ระบบจะไม่ลบโครงการอัตโนมัติ');
 const states=allocation.projects.map(p=>{const state=updateProject(p,oldStates.find(s=>s.projectId===p.id));state.year=allocation.year;return state;});assertPreserved(oldStates,states);
 const projects=allocation.projects.map(p=>{const s=states.find(s=>s.projectId===p.id),value={id:p.id,department:p.department,name:p.name,owner:p.owner,amounts:p.amounts.slice(),income:[0,0,0,0],remaining:[0,0,0,0],activities:p.activities.map(a=>({name:a.name,owner:a.owner,amounts:a.amounts.slice(),income:[0,0,0,0],remaining:[0,0,0,0]}))};
  for(const b of s.blocks){const f=A.funds.indexOf(b.budgetType);if(f<0)throw Error('ประเภทเงินเดิมไม่ถูกต้อง');value.income[f]=A.money(A.cents(value.income[f])+A.cents(b.received));value.remaining[f]=A.money(A.cents(value.remaining[f])+A.cents(b.current));const a=value.activities.find(a=>A.clean(a.name)===A.clean(b.activity));if(a){a.income[f]=A.money(A.cents(a.income[f])+A.cents(b.received));a.remaining[f]=A.money(A.cents(a.remaining[f])+A.cents(b.current));}}
  if(p.aggregation)value.aggregation='รวมเงินอุดหนุน ไม่แยกกลุ่มสาระ';return value;
 });
 const summary={...(oldSummary||{}),year:allocation.year,status:'firestore',source:'รายรับจาก '+allocation.source.filename,projects,departments:A.departments.map(name=>({name,complete:true,income:A.funds.map((_,f)=>A.money(projects.filter(p=>p.department===name).reduce((n,p)=>n+A.cents(p.income[f]),0))),remaining:A.funds.map((_,f)=>A.money(projects.filter(p=>p.department===name).reduce((n,p)=>n+A.cents(p.remaining[f]),0)))}))};
 const catalog=allocation.projects.map(p=>({id:p.id,owner:p.owner,activities:p.activities.map(a=>({name:a.name,owner:a.owner}))}));
 const references={...reference,registers:{...(reference.registers||{}),description:'ทะเบียนรายรับตามไฟล์ Excel ที่ตรวจสอบและยืนยันแล้ว',projects:Object.fromEntries(states.map(s=>[s.projectId,s.blocks.map(b=>({budgetType:b.budgetType,activity:b.activity,registerId:b.registerId||'',sourceHeaderRow:b.headerRow}))]))}};
 const report={...allocation.report,preservedEntries:expenses(oldStates).length,expenseDigest:hash(expenses(oldStates)),preservedLoans:oldStates.reduce((n,s)=>n+(s.borrowing||[]).length,0),spent:A.money(states.reduce((n,s)=>n+s.blocks.reduce((a,b)=>a+A.cents(b.used),0),0)),project14:projects.find(p=>p.id===14)||null};
 return {allocation,states,summary,catalog,references,report};
}
function projectEntries(block){let spent=0;return (block.entries||[]).map(e=>{spent+=A.cents(Number(e.spent||0));return {...e,used:A.money(spent),remaining:A.money(A.cents(block.openingBalance)+A.cents(e.cumulativeReceipts||0)-spent)};});}
function service(db,stamp){
 const parse=s=>s.exists?JSON.parse(s.data().json):null;
 async function read(tx,input){
  const allocation=A.normalize(input),year=allocation.year,summaryRef=db.doc('budget_public_years/'+year),catalogRef=db.doc('budget_catalog/'+year),referenceRef=db.doc('budget_reference_data/'+year);
  const [sy,ca,re]=await Promise.all([tx.get(summaryRef),tx.get(catalogRef),tx.get(referenceRef)]);if(sy.data()?.locked)throw Error('ปีงบประมาณนี้ถูกล็อกไว้');const oldSummary=parse(sy);
  const ids=[...new Set([...(oldSummary?.projects||[]).map(p=>p.id),...allocation.projects.map(p=>p.id)])].sort((a,b)=>a-b);
  const docs=await Promise.all(ids.map(id=>tx.get(db.doc('budget_registers/'+year+'-'+id))));
  const oldStates=docs.filter(d=>d.exists).map(parse);const version=d=>({id:d.ref?.path||d.id,time:d.updateTime?{seconds:d.updateTime.seconds,nanoseconds:d.updateTime.nanoseconds}:null});
  const token=hash({allocation,versions:[sy,ca,re,...docs].map(version)}),result=build(input,oldSummary,oldStates,parse(re)||{});
  return {...result,token,oldStates,sy,ca,re,docs,summaryRef,catalogRef,referenceRef};
 }
 return {
  async preview(user,input){guard(user);return db.runTransaction(async tx=>{const r=await read(tx,input);return {token:r.token,report:r.report,projects:r.summary.projects,source:r.allocation.source,year:r.allocation.year};});},
  async publish(user,request){guard(user);const {input,token,confirmYear,acknowledged,requestId}=request||{};require('./model').requestId(requestId);if(!input||String(input.year)!==confirmYear||acknowledged!==true||typeof token!=='string')throw Error('กรุณาตรวจสอบข้อมูลและยืนยันปีงบประมาณก่อนอัปเดต');
   return db.runTransaction(async tx=>{const receiptRef=db.doc('budget_allocation_imports/'+requestId),oldReceipt=await tx.get(receiptRef),inputHash=hash(input);if(oldReceipt.exists){if(oldReceipt.data().inputHash!==inputHash||oldReceipt.data().userId!==user.id)throw Error('รหัสคำขอถูกใช้กับข้อมูลอื่นแล้ว');return oldReceipt.data().receipt;}
    const r=await read(tx,input);if(r.token!==token)throw Error('ข้อมูลบนเว็บเปลี่ยนหลังตรวจสอบ กรุณาตรวจสอบไฟล์อีกครั้ง');assertPreserved(r.oldStates,r.states);
    const now=new Date().toISOString();r.summary.updatedAt=now;r.summary.snapshotDate=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());r.summary.allocationImport={id:requestId,source:r.allocation.source,at:now,expenseDigest:r.report.expenseDigest};
    const receipt={id:requestId,year:input.year,at:now,source:r.allocation.source,report:r.report};
    tx.create(receiptRef,{year:input.year,userId:user.id,userName:user.name||user.id,inputHash,createdAt:stamp(),receipt});
    tx.create(receiptRef.collection('backup').doc('metadata'),{summary:r.sy.data()||null,catalog:r.ca.data()||null,reference:r.re.data()||null});
    for(const doc of r.docs)if(doc.exists)tx.create(receiptRef.collection('registers').doc(doc.id),doc.data());
    for(const state of r.states){state.revision=crypto.randomUUID();state.allocationImportId=requestId;tx.set(db.doc('budget_registers/'+input.year+'-'+state.projectId),{year:input.year,projectId:state.projectId,json:JSON.stringify(state),updatedAt:stamp(),updatedBy:user.id},{merge:true});}
    tx.set(r.summaryRef,{year:input.year,json:JSON.stringify(r.summary),updatedAt:stamp()},{merge:true});tx.set(r.catalogRef,{json:JSON.stringify(r.catalog),updatedAt:stamp()},{merge:true});tx.set(r.referenceRef,{json:JSON.stringify(r.references),updatedAt:stamp()},{merge:true});return receipt;
   });
  },
  async history(user,year){guard(user);require('./model').year(year);const docs=await db.collection('budget_allocation_imports').where('year','==',year).limit(200).get();return docs.docs.map(d=>({id:d.id,user:d.data().userName,...d.data().receipt})).sort((a,b)=>b.at.localeCompare(a.at)).slice(0,30);}
 };
}
module.exports={allowed,guard,normalize:A.normalize,hash,expenses,assertPreserved,balance,build,projectEntries,service};
