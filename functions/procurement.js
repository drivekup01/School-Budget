'use strict';
const F=require('./budget-forms');
const {randomUUID}=require('node:crypto');
const keys=['school-procurement-preview-values-v1','school-procurement-page3-choices-v1','school-procurement-page4-table-v1','school-procurement-page6-table-v1'];
const object=v=>v&&typeof v==='object'&&!Array.isArray(v);
function validate(data){if(!object(data)||data.format!=='school-procurement-document-v1'||data.version!==1||!object(data.stores)||Object.keys(data.stores).length!==keys.length||!keys.every(k=>object(data.stores[k])))throw Error('ข้อมูลเอกสารจัดซื้อจัดจ้างไม่ครบ');if(Buffer.byteLength(JSON.stringify(data),'utf8')>800000)throw Error('เอกสารใหญ่เกินกำหนด 800 KB');return data;}
function id(value){if(typeof value!=='string'||! /^[a-zA-Z0-9_-]{1,120}$/.test(value))throw Error('รหัสเอกสารไม่ถูกต้อง');return value}
function metadata(data,documentId){const f=data.stores[keys[0]],year=Number(data.academicYear)||Number(String(f.document_date||'').match(/\/(\d{2,4})\s*$/)?.[1])||new Date(data.savedAt).getUTCFullYear()+543;return {id:documentId,name:String(data.name||'เอกสารจัดซื้อจัดจ้าง').slice(0,120),savedAt:data.savedAt,academicYear:year<100?year+2500:year,department:String(f.requesting_unit||''),documentNumber:String(f.document_date||'')};}
async function handle(method,args,user,db,FieldValue){
 const refFor=value=>db.doc('budget_documents/procurement-'+id(value)),idxFor=value=>db.doc('budget_procurement_index/'+id(value)),draft=db.doc('budget_procurement_drafts/'+user.id);
 if(method==='listProcurementDocuments'){const rows=(await db.collection('budget_procurement_index').get()).docs.map(d=>d.data()).filter(d=>!d.deleted);return Promise.all(rows.map(async d=>{let createdBy=d.createdBy;if(!createdBy){const snap=await refFor(d.id).get();if(snap.exists)createdBy=F.owner(JSON.parse(snap.data().json),snap.data());}return {...d,createdBy:createdBy||'',canEdit:F.manager(user)||createdBy===user.id};}));}
 if(method==='openProcurementDocument'){const snap=await refFor(args[0]).get();if(!snap.exists||snap.data().deleted)throw Error('ไม่พบเอกสาร');return {id:args[0],data:JSON.parse(snap.data().json),canEdit:F.editable(user,JSON.parse(snap.data().json),snap.data())};}
 if(method==='saveProcurementDocument'){
  const [input,documentId=randomUUID(),options={}]=args;validate(input);const ref=refFor(documentId),index=idxFor(documentId);
  return db.runTransaction(async tx=>{const old=await tx.get(ref);if(options.importOnly&&old.exists)return metadata(JSON.parse(old.data().json),documentId);if(old.exists){if(!F.editable(user,JSON.parse(old.data().json),old.data()))throw Object.assign(Error('แก้ไขได้เฉพาะเอกสารของตนเอง หรือฝ่ายงบประมาณ'),{code:'permission-denied'});if(old.data().deleted)throw Error('เอกสารถูกลบแล้ว');if(JSON.parse(old.data().json).savedAt!==options.expectedSavedAt)throw Error('เอกสารเปลี่ยนแล้ว กรุณาเปิดฉบับล่าสุดก่อนบันทึก');}
   const data={...input,createdBy:old.exists?F.owner(JSON.parse(old.data().json),old.data()):user.id,savedAt:options.importOnly&&input.savedAt?input.savedAt:new Date().toISOString()},meta={...metadata(data,documentId),createdBy:data.createdBy};tx.set(ref,{kind:'procurement',year:meta.academicYear,json:JSON.stringify(data),deleted:false,createdBy:data.createdBy,updatedBy:user.id,updatedAt:FieldValue.serverTimestamp()});tx.set(index,{...meta,deleted:false});return meta;});
 }
 if(method==='setProcurementDocumentDeleted'){if(!F.manager(user))throw Object.assign(Error('เฉพาะฝ่ายงบประมาณหรือผู้ดูแลระบบ'),{code:'permission-denied'});const [documentId,deleted]=args;if(typeof deleted!=='boolean')throw Error('คำขอไม่ถูกต้อง');const ref=refFor(documentId),index=idxFor(documentId);return db.runTransaction(async tx=>{const s=await tx.get(ref);if(!s.exists)throw Error('ไม่พบเอกสาร');tx.update(ref,{deleted,updatedBy:user.id,updatedAt:FieldValue.serverTimestamp()});tx.set(index,{...metadata(JSON.parse(s.data().json),documentId),createdBy:F.owner(JSON.parse(s.data().json),s.data()),deleted});return true;});}
 if(method==='getProcurementDraft'){const s=await draft.get();return s.exists?JSON.parse(s.data().json):null;}
 if(method==='saveProcurementDraft'){const [value]=args;validate(value?.data);if(!Number.isInteger(value.page)||value.page<1||value.page>16)throw Error('หน้าเอกสารไม่ถูกต้อง');await draft.set({json:JSON.stringify(value),updatedAt:FieldValue.serverTimestamp()});return true;}
 if(method==='clearProcurementDraft'){await draft.delete();return true;}
 throw Error('คำขอเอกสารไม่ถูกต้อง');
}
module.exports={keys,validate,id,metadata,handle};
