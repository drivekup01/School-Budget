'use strict';
const M=require('./model');
const {randomUUID}=require('node:crypto');
const norm=v=>String(v||'').replace(/\s+/g,'');
function validTarget(d,state,block){
 if((d.documentKind||'one')!=='one'||Number(d.year)!==state.year||Number(d.projectId)!==state.projectId||d.fund!==block.budgetType||(!M.projectLevel(state)&&d.activity&&block.activity&&norm(d.activity)!==norm(block.activity)))throw Error('งบ 1 ต้องเป็นปี โครงการ กิจกรรม และประเภทเงินเดียวกับปลายทาง');
 if(!String(d.fields?.number1||'').trim())throw Error('งบ 1 ยังไม่มีเลขที่เอกสาร');
}
function suggestedComment(record){return 'ยืมงบจาก'+record.source.name+(record.source.activity?' กิจกรรม '+record.source.activity:'')+' ประเภท'+record.budgetType+' จำนวน '+record.amount.toLocaleString('th-TH',{minimumFractionDigits:2,maximumFractionDigits:2})+' บาท เพื่อ'+record.reason+' (รายการยืมเลขที่ '+record.number+')'}
function linkDocument(d,record,custom){
 const links=d.borrowingLinks||[];if(links.some(l=>l.loanId===record.id))return d;if(links.length>=50)throw Error('เอกสารนี้มีรายการยืมครบ 50 รายการแล้ว');
 const comment=custom===undefined?suggestedComment(record):String(custom).trim();if(!comment||comment.length>1000)throw Error('ความเห็นต้องมีข้อความและไม่เกิน 1,000 ตัวอักษร');
 d.fields||={};const next=[d.fields.planningReason,comment].filter(Boolean).join('\n');if(next.length>10000)throw Error('ความเห็นใน งบ 1 ยาวเกินกำหนด');
 d.fields.planningReason=next;d.borrowingLinks=[...links,{loanId:record.id,year:record.year,number:record.number,amount:record.amount,source:record.source,destination:record.destination,date:record.date,reason:record.reason,comment,status:'active'}];d.borrowingRevision=randomUUID();return d;
}
function cancelDocumentLink(d,record){const link=d.borrowingLinks?.find(l=>l.loanId===record.id);if(!link||link.status==='cancelled')return d;link.status='cancelled';link.cancelledAt=new Date().toISOString();const note='ยกเลิกการยืมเลขที่ '+record.number+' จำนวน '+record.amount.toLocaleString('th-TH',{minimumFractionDigits:2,maximumFractionDigits:2})+' บาท';d.fields||={};d.fields.planningReason=[d.fields.planningReason,note].filter(Boolean).join('\n');d.borrowingRevision=randomUUID();return d;}
function preserveLinks(old,value){if(old.borrowingRevision&&value.borrowingRevision!==old.borrowingRevision)throw Error('ข้อมูลการยืมหรือความเห็นเปลี่ยนแล้ว กรุณาเปิดเอกสารล่าสุดก่อนบันทึก');if(old.borrowingRevision){value.borrowingRevision=old.borrowingRevision;value.borrowingLinks=old.borrowingLinks||[];}return value}
module.exports={validTarget,suggestedComment,linkDocument,cancelDocumentLink,preserveLinks};
