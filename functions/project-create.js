'use strict';
const crypto=require('node:crypto'),M=require('./model'),A=require('./allocation-import'),D=require('./allocation-model');
const clone=v=>JSON.parse(JSON.stringify(v));
function add(summary,state,input){
 const mode=input.fundingMode||'additional';if(!['additional','transfer'].includes(mode)||input.kind==='project'&&mode!=='additional')throw Error('รูปแบบการจัดสรรงบไม่ถูกต้อง');
 const kind=input.kind;if(!['project','activity'].includes(kind))throw Error('ประเภทคำขอไม่ถูกต้อง');
 const name=D.clean(M.text(input.name,240)),owner=D.clean(M.text(input.owner,200)),fund=M.TYPES.indexOf(input.budgetType);
 if(fund<0)throw Error('เลือกประเภทงบประมาณ');
 const amount=input.amount===0?0:M.money(input.amount),amounts=M.TYPES.map((_,i)=>i===fund?amount:0);
 let p;
 if(kind==='project'){
  if(!D.departments.includes(input.department))throw Error('เลือกฝ่ายงาน');
  if(summary.projects.some(p=>D.clean(p.name)===name))throw Error('มีชื่อโครงการนี้แล้ว');
  if(summary.projects.length>=200)throw Error('จำนวนโครงการเต็มแล้ว');
  const id=Math.max(0,...summary.projects.map(p=>p.id))+1;
  p={id,name,department:input.department,owner,amounts:amounts.slice(),income:[0,0,0,0],remaining:[0,0,0,0],activities:[]};summary.projects.push(p);
  state={year:summary.year,projectId:id,sheetName:name,owner,department:p.department,blocks:[],borrowing:[]};
 }else{
  p=summary.projects.find(p=>p.id===input.projectId);if(!p||!state||state.projectId!==p.id)throw Error('ไม่พบโครงการ');
  if(state.revision!==input.revision)throw Error('ข้อมูลเปลี่ยนแล้ว กรุณาโหลดล่าสุดก่อนบันทึก');
  if(p.activities.some(a=>D.clean(a.name)===name||D.clean(a.displayName)===name))throw Error('มีชื่อกิจกรรมนี้แล้ว');
  if(p.activities.length>=200)throw Error('จำนวนกิจกรรมเต็มแล้ว');
  if(mode==='transfer'){
   if(!(amount>0))throw Error('ยอดแบ่งงบต้องมากกว่า 0 บาท');
   const source=Number.isInteger(input.sourceBlockIndex)?state.blocks.find(b=>b.blockIndex===input.sourceBlockIndex):null;
   if(!source||source.budgetType!==input.budgetType)throw Error('เลือกแหล่งงบเดิมให้ตรงกับประเภทเงิน');
   const available=M.round(source.openingBalance);
   if(amount>available)throw Error('ยอดแบ่งเกินงบเดิมที่จัดสรรได้');
   const sourceActivity=source.activity?p.activities.find(a=>a.name===source.activity):null;
   if(source.activity&&(!sourceActivity||Number(sourceActivity.amounts?.[fund]||0)<amount))throw Error('ไม่พบยอดจัดสรรของกิจกรรมต้นทาง');
   A.balance(source,M.round(source.openingBalance-amount),{allowNegative:true});
   state.allocationReviewRequired=true;
   if(sourceActivity){sourceActivity.amounts[fund]=M.round(sourceActivity.amounts[fund]-amount);delete sourceActivity.adjustedAmounts;delete sourceActivity.adjustedIncome;}
  }else p.amounts=p.amounts.map((v,i)=>M.round((v||0)+amounts[i]));
  p.activities.push({name,owner,amounts:amounts.slice(),income:[0,0,0,0],remaining:[0,0,0,0]});
  delete p.adjustedAmounts;delete p.adjustedIncome;
 }
 const header=Math.max(0,...state.blocks.map(b=>b.headerRow),...state.blocks.flatMap(b=>(b.entries||[]).map(e=>e.row)))+10;
 state.blocks.push(A.balance({blockIndex:Math.max(-1,...state.blocks.map(b=>b.blockIndex))+1,headerRow:header,sourceHeaderRow:header,registerId:'P'+p.id+'-CUSTOM-'+crypto.randomUUID(),budgetType:M.TYPES[fund],activity:kind==='activity'?name:null,lastRow:header,lastEntryRow:header,noteColumn:7,usedColumn:8,entries:[],incoming:0,outgoing:0,additionalReceipts:0},amount));
 state.revision=crypto.randomUUID();M.updateSummary(summary,[state]);return {summary,state,projectId:p.id};
}
function service(db,stamp){return async(user,input)=>{
 A.guard(user);M.year(input.year);M.requestId(input.requestId);if(!['project','activity'].includes(input.kind))throw Error('คำขอไม่ถูกต้อง');if(input.kind==='activity'&&(!Number.isInteger(input.projectId)||input.projectId<1))throw Error('โครงการไม่ถูกต้อง');
 const hash=A.hash(input);return db.runTransaction(async tx=>{
 const op=db.doc('budget_operations/structure-'+input.requestId),old=await tx.get(op);if(old.exists){if(old.data().hash!==hash||old.data().userId!==user.id)throw Error('รหัสคำขอซ้ำ');return old.data().result;}
 const sr=db.doc('budget_public_years/'+input.year),cr=db.doc('budget_catalog/'+input.year),fr=db.doc('budget_reference_data/'+input.year);
 const [sy,ca,rf]=await Promise.all([tx.get(sr),tx.get(cr),tx.get(fr)]);if(!sy.exists||!ca.exists||!rf.exists)throw Error('ปีนี้ยังไม่มีข้อมูลงบประมาณ');if(sy.data().locked)throw Error('ปีงบประมาณนี้เก็บถาวรแล้ว แก้ไขไม่ได้');
 const summary=JSON.parse(sy.data().json),catalog=JSON.parse(ca.data().json),refs=JSON.parse(rf.data().json);if(summary.year!==input.year||!Array.isArray(catalog))throw Error('โครงสร้างข้อมูลปีไม่ถูกต้อง');
 const id=input.kind==='project'?Math.max(0,...summary.projects.map(p=>p.id))+1:input.projectId,rr=db.doc('budget_registers/'+input.year+'-'+id),re=await tx.get(rr);if(input.kind==='project'&&re.exists)throw Error('เลขโครงการถูกใช้แล้ว');if(input.kind==='activity'&&!re.exists)throw Error('ไม่พบทะเบียนโครงการ');
 const state=re.exists?JSON.parse(re.data().json):null,before=clone(state),beforeProject=clone(summary.projects.find(p=>p.id===id)||null),result=add(summary,state,input),p=summary.projects.find(p=>p.id===id);
 if(before)A.assertPreserved([before],[result.state]);const ci=catalog.findIndex(p=>p.id===id),previous=ci<0?null:catalog[ci],item={...previous,id,owner:previous?.owner??p.owner,activities:p.activities.map(a=>previous?.activities?.find(old=>old.name===a.name)||({name:a.name,owner:a.owner}))};if(ci<0)catalog.push(item);else catalog[ci]=item;
 refs.registers||={};refs.registers.projects||={};refs.registers.projects[id]=result.state.blocks.map(b=>({budgetType:b.budgetType,activity:b.activity,registerId:b.registerId,sourceHeaderRow:b.headerRow}));
 const saved={saved:true,projectId:id};for(const [ref,snap,json] of [[sr,sy,summary],[cr,ca,catalog],[fr,rf,refs],[rr,re,result.state]])tx.set(ref,{...(snap.exists?snap.data():{}),json:JSON.stringify(json),updatedAt:stamp(),updatedBy:user.id});
 tx.create(op,{hash,userId:user.id,year:input.year,projectId:id,kind:input.kind,before:JSON.stringify(before),after:JSON.stringify(result.state),beforeProject:JSON.stringify(beforeProject),afterProject:JSON.stringify(p),result:saved,createdAt:stamp()});return saved;
 });
};}
module.exports={add,service};
