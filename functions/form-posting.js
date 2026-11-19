'use strict';
const M=require('./model');
const norm=v=>String(v||'').replace(/\s/g,'');
async function stage(tx,db,d,old,user){
 if(d.draftOnly)return;
 if(d.documentKind==='two'){if(d.referenceDocumentId){const source=await tx.get(db.doc('budget_documents/forms-'+M.requestId(d.referenceDocumentId)));if(source.exists&&!source.data().deleted){const one=JSON.parse(source.data().json);if((one.documentKind||'one')==='one'&&Number(one.year)===Number(d.year)&&Number(one.projectId)===Number(d.projectId)&&one.ledgerPosted){d.ledgerPosted=structuredClone(one.ledgerPosted);d.finance=structuredClone(one.finance||null);d.financialMode='reference-one';}}}return;}
 const year=M.year(Number(d.year)),projectId=Number(d.projectId),ref=db.doc('budget_registers/'+year+'-'+projectId),summaryRef=db.doc('budget_public_years/'+year);
 const posted=old?.ledgerPosted;
 const sourceYear=posted?M.year(Number(posted.year)):year;
 const sourceProject=posted?Number(posted.projectId):projectId;
 const crossRegister=sourceYear!==year||sourceProject!==projectId;
 const sourceRef=crossRegister?db.doc('budget_registers/'+sourceYear+'-'+sourceProject):ref;
 const sourceSummaryRef=sourceYear!==year?db.doc('budget_public_years/'+sourceYear):summaryRef;
 const [snap,sy,sourceSnap,sourceSy]=await Promise.all([
  tx.get(ref),tx.get(summaryRef),
  crossRegister?tx.get(sourceRef):null,
  sourceYear!==year?tx.get(sourceSummaryRef):null
 ]);
 if(!snap.exists||!sy.exists)throw Error('ไม่พบทะเบียนงบประมาณของโครงการปลายทาง');
 if(sy.data().locked)throw Error('ปีปลายทางเป็นข้อมูลเก็บถาวร ไม่สามารถตัดยอดได้');
 if(crossRegister&&(!sourceSnap.exists||(sourceSy&&!sourceSy.exists)))throw Error('ไม่พบทะเบียนหรือยอดสรุปของรายการเดิม');
 if(sourceSy?.data().locked)throw Error('ปีเดิมเป็นข้อมูลเก็บถาวร ไม่สามารถคืนยอดได้');
 const state=JSON.parse(snap.data().json),summary=JSON.parse(sy.data().json),before=JSON.stringify(state);
 const sourceState=crossRegister?JSON.parse(sourceSnap.data().json):state;
 const sourceBefore=crossRegister?JSON.stringify(sourceState):before;
 const funds=state.blocks.filter(b=>b.budgetType===d.fund),exact=funds.filter(b=>norm(b.activity)===norm(d.activity)),matches=exact.length?exact:funds.filter(b=>!b.activity);
 if(matches.length!==1)throw Error('กรุณาเลือกกิจกรรมและประเภทเงินให้ตรงกับทะเบียนเพียงชุดเดียว');const block=matches[0];
 const amount=M.money(Number(d.requestAmount)),number=M.text(d.fields.number1,80),date=M.date(d.fields.date1);
 const input={revision:state.revision,headerRow:block.headerRow,number,date,spent:amount,description:String(d.fields.purpose||d.fields.expense||(d.items||[]).map(i=>i.description).filter(Boolean).join(' / ')||d.activity||d.projectName).slice(0,500),note:'เอกสารงบ 1 ['+d.id+']',requestId:d.id,documentReferences:[{id:d.id,kind:'one',number}]};
 const linked=sourceState.blocks.flatMap(b=>b.entries.filter(e=>!e.deleted&&e.spent>0&&(e.documentReferences?.some(r=>r.id===d.id)||String(e.note||'').includes('['+d.id+']'))).map(e=>({b,e})));
 if(linked.length>1)throw Error('พบรายจ่ายอ้างอิงเอกสารนี้หลายรายการ กรุณาตรวจทะเบียนก่อน');
 let found=linked[0];
 if(!found&&posted){
  // Older postings may identify the expense only by its row and original block.
  const matches=sourceState.blocks.filter(b=>b.budgetType===old.fund&&(!b.activity||norm(b.activity)===norm(old.activity)))
   .flatMap(b=>b.entries.filter(e=>e.row===posted.row&&!e.deleted&&e.spent>0&&e.number===old.fields?.number1).map(e=>({b,e})));
  if(matches.length!==1)throw Error('รายจ่ายเดิมถูกยกเลิกหรือไม่พบ กรุณาตรวจทะเบียนก่อน');
  found=matches[0];
 }
 if(!found){const existing=block.entries.filter(e=>!e.deleted&&e.spent>0&&e.number===number);if(existing.length){if(existing.length!==1||existing[0].spent!==amount||existing[0].documentReferences?.some(r=>r.id!==d.id))throw Error('มีเลขเอกสารนี้ในทะเบียนแล้ว กรุณาตรวจยอดเดิมเพื่อป้องกันการตัดซ้ำ');found={b:block,e:existing[0]};}}
 const moving=!!found&&(crossRegister||found.b!==block);
 if(moving){
  if(!require('./budget-forms').manager(user))throw Error('เฉพาะฝ่ายงบประมาณหรือผู้ดูแลระบบที่ย้ายรายการตัดยอดได้');
  if(old?.borrowingLinks?.some(link=>link.status!=='cancelled'))throw Error('เอกสารยังมีรายการยืมที่ใช้งานอยู่ กรุณาจัดการรายการยืมก่อนย้าย');
  if(Number(found.e.received||0)!==0||found.e.documentReferences?.some(link=>link.id!==d.id||link.kind!=='one'))
   throw Error('รายการเดิมมีเงินรับหรืออ้างอิงเอกสารอื่น กรุณาตรวจทะเบียนก่อนย้าย');
 }
 const sameProjectCredit=found&&!crossRegister?found.e.spent:0;
 const sameBlockCredit=found&&!moving?found.e.spent:0;
 const sum=k=>M.round(state.blocks.reduce((n,b)=>n+(Number(b[k])||0),0));
 const finance={received:sum('received'),used:M.round(sum('used')-sameProjectCredit),current:M.round(sum('current')+sameProjectCredit),activityCurrent:M.round(block.current+sameBlockCredit),checkedAt:new Date().toISOString(),revision:state.revision};
 const result=found&&!moving
  ?M.mutateEntry(state,{...input,action:'edit',row:found.e.row})
  :M.saveEntry(state,input);
 if(moving)M.removeMovedEntry(sourceState,found.b,found.e);
 d.financialMode='auto-post-one';d.finance=finance;d.ledgerPosted={requestId:d.id,row:result.row,year,projectId,amount,sourceKind:'one',postedAt:old?.ledgerPosted?.postedAt||new Date().toISOString(),updatedAt:new Date().toISOString()};delete d.ledgerPending;delete d.ledgerUpdatePending;
 const updatedAt=new Date().toISOString();
 if(sourceSy){
  const sourceSummary=JSON.parse(sourceSy.data().json);
  M.updateSummary(sourceSummary,[sourceState]);
  tx.update(sourceSummaryRef,{json:JSON.stringify(sourceSummary),updatedAt});
 }
 M.updateSummary(summary,crossRegister&&!sourceSy?[sourceState,state]:[state]);
 if(crossRegister)tx.update(sourceRef,{json:JSON.stringify(sourceState),updatedAt});
 tx.update(ref,{json:JSON.stringify(state),updatedAt});
 tx.update(summaryRef,{json:JSON.stringify(summary),updatedAt});
 const audit={method:moving?'moveBudgetFormPosting':found?'updateBudgetFormPosting':'postBudgetForm',userId:user.id,year,projectId,documentId:d.id,before,after:JSON.stringify(state),createdAt:updatedAt};
 if(moving)Object.assign(audit,{sourceYear,sourceProjectId:sourceProject,sourceRow:found.e.row});
 tx.create(db.collection('budget_audit').doc(),audit);
 if(moving&&crossRegister)tx.create(db.collection('budget_audit').doc(),{
  method:'returnMovedBudgetFormPosting',userId:user.id,year:sourceYear,projectId:sourceProject,
  destinationYear:year,destinationProjectId:projectId,documentId:d.id,
  before:sourceBefore,after:JSON.stringify(sourceState),createdAt:updatedAt
 });
}
module.exports={stage};
