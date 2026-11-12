'use strict';
const crypto=require('node:crypto'),A=require('./allocation-import'),M=require('./model');
const clone=v=>JSON.parse(JSON.stringify(v));
function edit(summary,state,input){
 if(state.revision!==input.revision)throw Error('ข้อมูลเปลี่ยนแล้ว กรุณาเปิดหน้าต่างแก้ไขใหม่');
 const p=summary.projects.find(p=>p.id===state.projectId);if(!p)throw Error('ไม่พบโครงการ');
 const names=p.activities.length?p.activities.map(a=>a.name):[''];
 if(!Array.isArray(input.rows)||input.rows.length!==names.length)throw Error('รายการกิจกรรมไม่ครบ');
 const rows=input.rows.map((r,i)=>{if(r.name!==names[i]||!Array.isArray(r.amounts)||r.amounts.length!==4||r.amounts.some(n=>typeof n!=='number'||!Number.isFinite(n)||n<0||n>1e9||Math.abs(n*100-Math.round(n*100))>0.0001))throw Error('ยอดเงินต้องไม่ติดลบและทศนิยมไม่เกิน 2 ตำแหน่ง');return r;});
 const before=clone(state),seen=new Set();let header=Math.max(0,...state.blocks.map(b=>b.headerRow),...state.blocks.flatMap(b=>(b.entries||[]).map(e=>e.row)));
 for(const b of state.blocks){const i=names.indexOf(b.activity||''),f=M.TYPES.indexOf(b.budgetType),key=i+':'+f;if(i<0||f<0||seen.has(key))throw Error('โครงสร้างทะเบียนไม่ตรงกับกิจกรรม กรุณาตรวจสอบทะเบียนก่อน');seen.add(key);A.balance(b,rows[i].amounts[f]);}
 rows.forEach((r,i)=>r.amounts.forEach((amount,f)=>{if(!seen.has(i+':'+f)&&amount>0){header+=10;state.blocks.push(A.balance({blockIndex:state.blocks.length,headerRow:header,sourceHeaderRow:header,registerId:'P'+state.projectId+'-EDIT-'+header,budgetType:M.TYPES[f],activity:r.name||null,lastRow:header,lastEntryRow:header,noteColumn:7,usedColumn:8,entries:[],incoming:0,outgoing:0,additionalReceipts:0},amount));}}));
 A.assertPreserved([before],[state]);p.amounts=M.TYPES.map((_,f)=>M.round(rows.reduce((s,r)=>s+r.amounts[f],0)));p.activities.forEach((a,i)=>{a.amounts=rows[i].amounts.slice();delete a.adjustedAmounts;delete a.adjustedIncome;});delete p.adjustedIncome;delete p.adjustedAmounts;
 state.revision=crypto.randomUUID();M.updateSummary(summary,[state]);return {state,summary};
}
function service(db,stamp){return async(user,input)=>{A.guard(user);M.year(input.year);M.requestId(input.requestId);if(!Number.isInteger(input.projectId))throw Error('โครงการไม่ถูกต้อง');const reason=M.text(input.reason,500);const hash=A.hash(input);return db.runTransaction(async tx=>{
 const op=db.doc('budget_operations/allocation-'+input.requestId),prior=await tx.get(op);if(prior.exists){if(prior.data().hash!==hash||prior.data().userId!==user.id)throw Error('รหัสคำขอซ้ำ');return {saved:true};}
 const sr=db.doc('budget_public_years/'+input.year),rr=db.doc('budget_registers/'+input.year+'-'+input.projectId),[sy,re]=await Promise.all([tx.get(sr),tx.get(rr)]);if(!sy.exists||!re.exists)throw Error('ไม่พบข้อมูลทะเบียน');if(sy.data().locked)throw Error('ปีงบประมาณนี้เก็บถาวรแล้ว แก้ไขไม่ได้');
 const summary=JSON.parse(sy.data().json),state=JSON.parse(re.data().json),before=JSON.stringify(state),beforeProject=JSON.stringify(summary.projects.find(p=>p.id===input.projectId));edit(summary,state,input);
 tx.set(rr,{...re.data(),json:JSON.stringify(state),updatedBy:user.id,updatedAt:stamp()});tx.set(sr,{...sy.data(),json:JSON.stringify(summary),updatedAt:stamp()});
 tx.create(op,{reason,hash,userId:user.id,year:input.year,projectId:input.projectId,before,beforeProject,after:JSON.stringify(state),afterProject:JSON.stringify(summary.projects.find(p=>p.id===input.projectId)),createdAt:stamp()});return {saved:true};
 });};}
module.exports={edit,service};
