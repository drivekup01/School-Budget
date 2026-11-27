'use strict';
const M=require('./model'),A=require('./allocation-import');
const norm=v=>String(v||'').replace(/\s/g,'');
function review(state,project,documents){
 const issues=[],add=(type,message,d,extra={})=>issues.push({type,message,documentId:d?.id||null,number:d?.fields?.number1||'',amount:Number(d?.requestAmount||0),...extra});
 for(const b of state.blocks){
  if(b.current<0)add('negative','ยอดคงเหลือต้นทางติดลบ ต้องย้ายรายการตัดยอดหรือแก้การจัดสรร',null,{activity:b.activity||'งบโครงการที่ยังไม่แยกกิจกรรม',fund:b.budgetType,amount:b.current});
  if(project.activities.length&&!b.activity)for(const e of b.entries||[])if(!e.deleted&&e.spent>0)add('unassigned-expense','รายจ่ายยังอยู่ที่โครงการ ยังไม่ได้แยกเข้ากิจกรรม',null,{number:e.number||'',amount:e.spent,row:e.row,fund:b.budgetType,documentId:e.documentReferences?.find(r=>r.kind==='one')?.id||null});
 }
 const entries=state.blocks.flatMap(b=>(b.entries||[]).filter(e=>!e.deleted&&e.spent>0).map(e=>({b,e})));
 for(const d of documents){
  if(Number(d.year)!==state.year||Number(d.projectId)!==state.projectId||d.documentKind==='two')continue;
  const missing=[];if(d.draftOnly||d.status==='draft')missing.push('ยังเป็นฉบับร่าง');if(!d.fields?.number1)missing.push('เลขที่ งบ 1');if(!d.fields?.date1)missing.push('วันที่ งบ 1');if(!d.fund)missing.push('ประเภทเงิน');if(!(Number(d.requestAmount)>0))missing.push('ยอดเบิก');if(!d.fields?.activityOwner)missing.push('ผู้รับผิดชอบกิจกรรม');
  if(missing.length)add('incomplete','ข้อมูลยังไม่ครบ: '+missing.join(', '),d);
  if(project.activities.length&&!d.activity)add('no-activity','ยังไม่ได้เลือกกิจกรรมให้ งบ 1',d);
  else if(d.activity&&!project.activities.some(a=>norm(a.name)===norm(d.activity)))add('unknown-activity','กิจกรรมใน งบ 1 ไม่ตรงกับกิจกรรมปัจจุบัน',d);
  let linked=entries.filter(({e})=>e.documentReferences?.some(r=>r.id===d.id&&r.kind==='one')||String(e.note||'').includes('['+d.id+']'));
  if(!linked.length&&d.ledgerPosted)linked=entries.filter(({e})=>e.row===d.ledgerPosted.row&&e.number===d.fields?.number1);
  if(!linked.length&&d.fields?.number1){const match=entries.filter(({b,e})=>e.number===d.fields.number1&&e.spent===Number(d.requestAmount)&&b.budgetType===d.fund);if(match.length===1)linked=match;}
  if(!linked.length)add('not-posted','ยังไม่พบรายการหักเงินในทะเบียนโครงการ / กิจกรรม',d);
  else if(linked.length>1)add('multiple-postings','พบรายการหักเงินหลายรายการ ต้องตรวจสอบการตัดซ้ำ',d);
  else{const {b,e}=linked[0];if(norm(b.activity)!==norm(d.activity)||b.budgetType!==d.fund)add('wrong-target','ตัดเงินอยู่คนละกิจกรรมหรือประเภทเงินกับ งบ 1',d,{postedActivity:b.activity||'งบโครงการที่ยังไม่แยกกิจกรรม',postedFund:b.budgetType});if(M.round(e.spent)!==M.round(Number(d.requestAmount)))add('wrong-amount','ยอดหักเงินจริงไม่ตรงกับยอด งบ 1',d,{postedAmount:e.spent});}
 }
 return {projectId:state.projectId,name:project.name,issues,pending:issues.length};
}
function service(db){return async(user,input)=>{A.guard(user);const year=M.year(Number(input.year)),id=Number(input.projectId);if(!Number.isInteger(id)||id<1)throw Error('เลือกโครงการ');const [r,s,docs]=await Promise.all([db.doc('budget_registers/'+year+'-'+id).get(),db.doc('budget_public_years/'+year).get(),db.collection('budget_documents').where('kind','==','forms').get()]);if(!r.exists||!s.exists)throw Error('ไม่พบโครงการ');const state=JSON.parse(r.data().json),project=JSON.parse(s.data().json).projects.find(p=>p.id===id);if(!project)throw Error('ไม่พบโครงการ');return review(state,project,docs.docs.filter(d=>!d.data().deleted).map(d=>JSON.parse(d.data().json)));};}
module.exports={review,service};
