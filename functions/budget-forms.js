'use strict';
const M=require('./model');
const B=require('./borrowing-documents');
const denied=()=>{throw Object.assign(Error('แก้ไขได้เฉพาะเอกสารของตนเอง หรือฝ่ายงบประมาณ'),{code:'permission-denied'})};
function manager(u){return u.schoolRole?['admin','budget'].includes(u.schoolRole):['admin','editor'].includes(u.role)}
function owner(d,meta={}){return d.createdBy||meta.createdBy||d.savedBy||meta.updatedBy||''}
function editable(u,d,meta){return manager(u)||!!owner(d,meta)&&owner(d,meta)===u.id}
function saved(value,old,u,meta={}){
 if(old&&!editable(u,old,meta))denied();
 const d=structuredClone(value),now=new Date().toISOString();
 if(old)B.preserveLinks(old,d);
 d.createdBy=old?owner(old,meta):u.id;d.createdAt=old?.createdAt||now;d.savedBy=u.id;d.savedAt=now;
 if(!d.draftOnly){const kind=d.documentKind||'one';if(!['one','two'].includes(kind))throw Error('ประเภทเอกสารไม่ถูกต้อง');M.year(Number(d.year));if(!Number.isInteger(Number(d.projectId))||Number(d.projectId)<=0)throw Error('กรุณาเลือกโครงการ');M.money(Number(d.requestAmount));M.text(d.fields?.[kind==='one'?'number1':'number2'],80);M.date(d.fields?.[kind==='one'?'date1':'date2']);}
 d.status=d.draftOnly?'draft':'completed';d.financialMode='document-only';
 // Historical postings remain evidence; documents can never create or change one.
 for(const k of ['ledgerPosted','ledgerPending','ledgerUpdatePending']){delete d[k];if(old?.[k])d[k]=structuredClone(old[k]);}
 return d;
}
function references(d){
 if(d.draftOnly||d.status==='draft')return [];
 const kinds=d.documentKind?[d.documentKind]:['one','two'];
 return kinds.filter(k=>['one','two'].includes(k)&&String(d.fields?.[k==='one'?'number1':'number2']||'').trim()).map(kind=>({id:d.id,kind,number:d.fields[kind==='one'?'number1':'number2'],year:Number(d.year),projectId:Number(d.projectId),activity:d.activity||'',fund:d.fund||''}));
}
async function resolveReferences(tx,db,input,state){
 if(!Object.hasOwn(input,'documentReferences'))return;
 const list=input.documentReferences;if(!Array.isArray(list)||list.length>2)throw Error('เลือกอ้างอิงได้อย่างละหนึ่งเอกสาร งบ 1 / งบ 2');
 const seen=new Set(),out=[],block=state.blocks.find(b=>b.headerRow===Number(input.headerRow));
 for(const ref of list){M.requestId(ref.id);if(!['one','two'].includes(ref.kind)||seen.has(ref.kind))throw Error('ประเภทเอกสารอ้างอิงไม่ถูกต้อง');seen.add(ref.kind);
  const snap=await tx.get(db.doc('budget_documents/forms-'+ref.id));if(!snap.exists||snap.data().deleted){const original=input.action==='edit'&&block?.entries.find(e=>e.row===Number(input.row))?.documentReferences?.find(r=>r.id===ref.id&&r.kind===ref.kind);if(original){out.push(structuredClone(original));continue;}throw Error('เอกสารอ้างอิงถูกลบแล้ว กรุณาเลือกใหม่');}
  const d=JSON.parse(snap.data().json),r=references(d).find(r=>r.kind===ref.kind);
  if(!r||r.year!==state.year||r.projectId!==state.projectId||!M.projectLevel(state)&&r.activity&&block?.activity&&r.activity.replace(/\s/g,'')!==block.activity.replace(/\s/g,''))throw Error('เลือกเอกสารที่บันทึกเสร็จแล้วในปี โครงการ และกิจกรรมเดียวกัน');
  out.push({id:r.id,kind:r.kind,number:r.number});
 }
 input.documentReferences=out;
}
function prohibitLegacyPosting(input){if(input.source!=='project-entry'&&/^เอกสารงบ\s*[12]\s*\[/u.test(input.note||''))throw Error('งบ 1 / งบ 2 เป็นเอกสารเท่านั้น กรุณาบันทึกรายจ่ายที่โครงการ / กิจกรรม');}
module.exports={manager,owner,editable,saved,references,resolveReferences,prohibitLegacyPosting};
