'use strict';
const M=require('./model');
const norm=v=>String(v||'').replace(/\s/g,'');
async function stage(tx,db,d,old,user){
 if(d.draftOnly)return;
 if(d.documentKind==='two'){if(d.referenceDocumentId){const source=await tx.get(db.doc('budget_documents/forms-'+M.requestId(d.referenceDocumentId)));if(source.exists&&!source.data().deleted){const one=JSON.parse(source.data().json);if((one.documentKind||'one')==='one'&&Number(one.year)===Number(d.year)&&Number(one.projectId)===Number(d.projectId)&&one.ledgerPosted){d.ledgerPosted=structuredClone(one.ledgerPosted);d.finance=structuredClone(one.finance||null);d.financialMode='reference-one';}}}return;}
 const year=M.year(Number(d.year)),projectId=Number(d.projectId),ref=db.doc('budget_registers/'+year+'-'+projectId),summaryRef=db.doc('budget_public_years/'+year);
 const [snap,sy]=await Promise.all([tx.get(ref),tx.get(summaryRef)]);
 if(!snap.exists||!sy.exists)throw Error('ไม่พบทะเบียนงบประมาณของโครงการ');if(sy.data().locked)throw Error('ปีนี้เป็นข้อมูลเก็บถาวร ไม่สามารถตัดยอดได้');
 const state=JSON.parse(snap.data().json),summary=JSON.parse(sy.data().json),before=JSON.stringify(state);
 if(old?.ledgerPosted&&(Number(old.ledgerPosted.year)!==year||Number(old.ledgerPosted.projectId)!==projectId))throw Error('เอกสารตัดยอดแล้ว ไม่สามารถเปลี่ยนปีหรือโครงการ');
 const funds=state.blocks.filter(b=>b.budgetType===d.fund),exact=funds.filter(b=>norm(b.activity)===norm(d.activity)),matches=exact.length?exact:funds.filter(b=>!b.activity);
 if(matches.length!==1)throw Error('กรุณาเลือกกิจกรรมและประเภทเงินให้ตรงกับทะเบียนเพียงชุดเดียว');const block=matches[0];
 const amount=M.money(Number(d.requestAmount)),number=M.text(d.fields.number1,80),date=M.date(d.fields.date1);
 const input={revision:state.revision,headerRow:block.headerRow,number,date,spent:amount,description:String(d.fields.purpose||d.fields.expense||(d.items||[]).map(i=>i.description).filter(Boolean).join(' / ')||d.activity||d.projectName).slice(0,500),note:'เอกสารงบ 1 ['+d.id+']',requestId:d.id,documentReferences:[{id:d.id,kind:'one',number}]};
 const linked=state.blocks.flatMap(b=>b.entries.filter(e=>!e.deleted&&e.spent>0&&(e.documentReferences?.some(r=>r.id===d.id)||String(e.note||'').includes('['+d.id+']'))).map(e=>({b,e})));
 if(linked.length>1)throw Error('พบรายจ่ายอ้างอิงเอกสารนี้หลายรายการ กรุณาตรวจทะเบียนก่อน');
 let found=linked[0];
 if(!found&&old?.ledgerPosted){const b=state.blocks.find(b=>b.entries.some(e=>e.row===old.ledgerPosted.row));const e=b?.entries.find(e=>e.row===old.ledgerPosted.row);if(!e||e.deleted||!(e.spent>0))throw Error('รายจ่ายเดิมถูกยกเลิกหรือไม่พบ กรุณาตรวจทะเบียนก่อน');found={b,e};}
 if(!found){const existing=block.entries.filter(e=>!e.deleted&&e.spent>0&&e.number===number);if(existing.length){if(existing.length!==1||existing[0].spent!==amount||existing[0].documentReferences?.some(r=>r.id!==d.id))throw Error('มีเลขเอกสารนี้ในทะเบียนแล้ว กรุณาตรวจยอดเดิมเพื่อป้องกันการตัดซ้ำ');found={b:block,e:existing[0]};}}
 if(found&&found.b!==block)throw Error('เอกสารตัดยอดแล้ว ไม่สามารถเปลี่ยนกิจกรรมหรือประเภทเงิน');
 const sum=k=>M.round(state.blocks.reduce((n,b)=>n+(Number(b[k])||0),0));
 const finance={received:sum('received'),used:M.round(sum('used')-(found?.e.spent||0)),current:M.round(sum('current')+(found?.e.spent||0)),activityCurrent:M.round(block.current+(found?.e.spent||0)),checkedAt:new Date().toISOString(),revision:state.revision};
 const result=found?M.mutateEntry(state,{...input,action:'edit',row:found.e.row}):M.saveEntry(state,input);
 d.financialMode='auto-post-one';d.finance=finance;d.ledgerPosted={requestId:d.id,row:result.row,year,projectId,amount,sourceKind:'one',postedAt:old?.ledgerPosted?.postedAt||new Date().toISOString(),updatedAt:new Date().toISOString()};delete d.ledgerPending;delete d.ledgerUpdatePending;
 M.updateSummary(summary,[state]);
 const updatedAt=new Date().toISOString();tx.update(ref,{json:JSON.stringify(state),updatedAt});tx.update(summaryRef,{json:JSON.stringify(summary),updatedAt});
 tx.create(db.collection('budget_audit').doc(),{method:found?'updateBudgetFormPosting':'postBudgetForm',userId:user.id,year,projectId,documentId:d.id,before,after:JSON.stringify(state),createdAt:new Date().toISOString()});
}
module.exports={stage};
