'use strict';
const {onCall,HttpsError}=require('firebase-functions/v2/https');
const {initializeApp,getApps}=require('firebase-admin/app');
const {getFirestore,FieldValue}=require('firebase-admin/firestore');
const B=require('./borrowing-documents');
const P=require('./procurement');
const M=require('./model');if(!getApps().length)initializeApp();const db=getFirestore();
const callable={region:'asia-southeast1',maxInstances:3,memory:'256MiB',timeoutSeconds:60,cors:['https://drivekup01.github.io','http://localhost:8765','http://127.0.0.1:8765']};
async function member(request){const a=request.auth;if(!a||a.token.email_verified!==true||a.token.firebase?.sign_in_provider!=='google.com')throw new HttpsError('unauthenticated','กรุณาเข้าสู่ระบบด้วย Google');const snap=await db.doc('budget_users/'+a.uid).get(),p=snap.data();if(!p||p.active!==true||p.email!==a.token.email||!['admin','editor'].includes(p.role))throw new HttpsError('permission-denied','บัญชีนี้ยังไม่ได้รับสิทธิ์ระบบงบประมาณ');return {...p,id:a.uid}}
function authorize(user,admin=false){if(admin?user.role!=='admin':!['admin','editor'].includes(user.role))throw new HttpsError('permission-denied','ไม่มีสิทธิ์ดำเนินการนี้')}
function parse(s){if(!s.exists)throw new HttpsError('not-found','ไม่พบข้อมูล');return JSON.parse(s.data().json)}
const registerRef=(year,id)=>db.doc('budget_registers/'+M.year(Number(year))+'-'+Number(id));
const summaryRef=year=>db.doc('budget_public_years/'+M.year(Number(year)));
async function ledger(method,input,user){const year=M.year(Number(input.year)),requestId=M.requestId(input.requestId||input.id),operation=db.doc('budget_operations/'+user.id+'-'+requestId+'-'+method);
 return db.runTransaction(async tx=>{const old=await tx.get(operation);if(old.exists){const result=JSON.parse(old.data().json);if(result.projectId){result.state=parse(await tx.get(registerRef(year,result.projectId)));delete result.projectId;}return result}
 const sy=await tx.get(summaryRef(year));if(sy.data()?.locked)throw new HttpsError('failed-precondition','ปีนี้เป็นข้อมูลเก็บถาวร อ่านได้อย่างเดียว');const summary=parse(sy);let states=[],result;
 if(method==='saveBudgetEntry'||method==='mutateBudgetEntry'){const s=parse(await tx.get(registerRef(year,input.projectId)));const before=JSON.parse(JSON.stringify(s));result=method==='saveBudgetEntry'?M.saveEntry(s,input):M.mutateEntry(s,input);states=[s];tx.create(db.collection('budget_audit').doc(),{method,userId:user.id,year,projectId:s.projectId,requestId,before:JSON.stringify(before),after:JSON.stringify(s),createdAt:FieldValue.serverTimestamp()});}
 else if(method==='saveBudgetBorrowing'){
  const a=parse(await tx.get(registerRef(year,input.sourceProjectId))),b=Number(input.destinationProjectId)===a.projectId?a:parse(await tx.get(registerRef(year,input.destinationProjectId)));
  const documentId=M.requestId(input.budgetDocumentId),ref=db.doc('budget_documents/forms-'+documentId),snap=await tx.get(ref),d=parse(snap),block=b.blocks.find(v=>v.blockIndex===Number(input.destinationBlockIndex));
  if(snap.data().deleted||!block)throw Error('เอกสารหรือทะเบียนปลายทางไม่พร้อมใช้งาน');B.validTarget(d,b,block);
  result=M.loan(a,b,input,user.id);Object.assign(result.record,{budgetDocumentId:documentId,budgetDocumentNumber:d.fields.number1});B.linkDocument(d,result.record,input.planningComment);
  d.savedAt=new Date().toISOString();tx.update(ref,{json:JSON.stringify(d),updatedBy:user.id,updatedAt:FieldValue.serverTimestamp()});
  states=[...new Set([a,b])];tx.create(db.doc('budget_loans/'+year+'-'+requestId),{year,json:JSON.stringify(result.record)});
 }
 else if(method==='cancelBudgetBorrowing'){
  const record=parse(await tx.get(db.doc('budget_loans/'+year+'-'+input.id))),a=parse(await tx.get(registerRef(year,record.source.projectId))),b=record.destination.projectId===a.projectId?a:parse(await tx.get(registerRef(year,record.destination.projectId)));
  let ref,snap;if(record.budgetDocumentId){ref=db.doc('budget_documents/forms-'+record.budgetDocumentId);snap=await tx.get(ref)}
  result=M.cancelLoan(a,b,record,user.id);states=[...new Set([a,b])];
  if(snap?.exists){const d=B.cancelDocumentLink(parse(snap),record);d.savedAt=new Date().toISOString();tx.update(ref,{json:JSON.stringify(d),updatedBy:user.id,updatedAt:FieldValue.serverTimestamp()})}
 }
 else throw new HttpsError('invalid-argument','คำขอไม่ถูกต้อง');
 for(const s of states)tx.update(registerRef(year,s.projectId),{json:JSON.stringify(s),updatedAt:FieldValue.serverTimestamp()});
 M.updateSummary(summary,states);tx.update(summaryRef(year),{json:JSON.stringify(summary),updatedAt:FieldValue.serverTimestamp()});
 const receipt={...result};delete receipt.state;if(result.state)receipt.projectId=result.state.projectId;tx.create(operation,{year,userId:user.id,json:JSON.stringify(receipt),createdAt:FieldValue.serverTimestamp()});return result;
 });
}
function validateDocument(value){if(!value||typeof value!=='object'||Array.isArray(value))throw Error('ข้อมูลเอกสารไม่ถูกต้อง');if(Buffer.byteLength(JSON.stringify(value),'utf8')>400000)throw Error('เอกสารมีขนาดใหญ่เกินกำหนด');M.requestId(value.id);return value}
exports.budgetApi=onCall(callable,async request=>{try{const user=await member(request),{method,args=[]}=request.data||{};if(!Array.isArray(args)||args.length>5)throw Error('คำขอไม่ถูกต้อง');
 if(method==='getBudgetUser')return user;
 if(['listProcurementDocuments','openProcurementDocument','saveProcurementDocument','setProcurementDocumentDeleted','getProcurementDraft','saveProcurementDraft','clearProcurementDraft'].includes(method)){authorize(user);return await P.handle(method,args,user,db,FieldValue);}
 if(method==='getBudgetReferenceData'){const snap=await db.doc('budget_reference_data/'+M.year(Number(args[0]))).get();return parse(snap);}
 if(method==='getBudgetProjectCatalog')return parse(await db.doc('budget_catalog/'+M.year(Number(args[0]))).get());
 if(method==='listBorrowingBudgetDocuments'){
  const year=M.year(Number(args[0])),project=Number(args[1]),docs=await db.collection('budget_documents').where('kind','==','forms').get();
  return docs.docs.filter(s=>!s.data().deleted).map(parse).filter(d=>(d.documentKind||'one')==='one'&&Number(d.year)===year&&Number(d.projectId)===project&&d.fields?.number1).map(d=>({id:d.id,number:d.fields.number1,projectName:d.projectName,activity:d.activity||'',fund:d.fund,requestAmount:d.requestAmount}));
 }
 if(method==='saveBudgetPlanningComment'){
  authorize(user);const input=args[0]||{},ref=db.doc('budget_documents/forms-'+M.requestId(input.id)),text=M.text(input.text,10000,false),expected=M.text(input.expectedText,10000,false);
  return db.runTransaction(async tx=>{const snap=await tx.get(ref),d=parse(snap);if(snap.data().deleted||(d.documentKind||'one')!=='one')throw Error('ไม่พบเอกสาร งบ 1 ที่แก้ไขได้');if((d.fields?.planningReason||'').trim()!==expected)throw Error('ความเห็นเปลี่ยนแล้ว กรุณาเปิดเอกสารล่าสุด');d.fields||={};d.fields.planningReason=text;d.borrowingRevision=require('node:crypto').randomUUID();d.savedAt=new Date().toISOString();tx.update(ref,{json:JSON.stringify(d),updatedBy:user.id,updatedAt:FieldValue.serverTimestamp()});return d});
 }
 if(method==='getBudgetRegister'){const state=parse(await registerRef(args[1],args[0]).get());for(const b of state.blocks)for(const e of b.entries)delete e.deletedOriginal;return state}
 if(method==='getBudgetDocumentFinance'){const state=parse(await registerRef(args[1],args[0]).get());return {year:state.year,projectId:state.projectId,revision:state.revision,blocks:state.blocks.map(b=>({budgetType:b.budgetType,activity:b.activity,received:b.received,used:b.used,current:b.current}))}}
 if(['saveBudgetEntry','mutateBudgetEntry','saveBudgetBorrowing','cancelBudgetBorrowing'].includes(method)){authorize(user,method==='mutateBudgetEntry'&&['delete','restore','purge'].includes(args[0]?.action));return await ledger(method,args[0]||{},user)}
 if(method==='listBudgetDocuments'){const kind=args[0];if(!['forms','disbursements'].includes(kind))throw Error('ประเภทเอกสารไม่ถูกต้อง');const docs=await db.collection('budget_documents').where('kind','==',kind).get();return docs.docs.map(d=>({...parse(d),_deleted:d.data().deleted===true}));}
 if(method==='saveBudgetDocument'){authorize(user);const [kind,value,options={}]=args;if(!['forms','disbursements'].includes(kind))throw Error('ประเภทเอกสารไม่ถูกต้อง');validateDocument(value);const ref=db.doc('budget_documents/'+kind+'-'+value.id);return await db.runTransaction(async tx=>{const old=await tx.get(ref);if(options.importOnly&&old.exists)return parse(old);const saved={...value,savedAt:new Date().toISOString(),savedBy:user.id};if(old.exists&&old.data().deleted)throw Error('เอกสารนี้ถูกลบแล้ว');if(old.exists&&kind==='forms')B.preserveLinks(parse(old),saved);tx.set(ref,{kind,json:JSON.stringify(saved),deleted:false,updatedBy:user.id,updatedAt:FieldValue.serverTimestamp()});return saved});}
 if(method==='setBudgetDocumentsDeleted'){authorize(user,true);const [ids,deleted]=args;if(!Array.isArray(ids)||ids.length>100||typeof deleted!=='boolean')throw Error('รายการไม่ถูกต้อง');const refs=ids.map(id=>db.doc('budget_documents/forms-'+M.requestId(id)));await db.runTransaction(async tx=>{const docs=await Promise.all(refs.map(r=>tx.get(r)));for(const d of docs)if(!d.exists)throw Error('ไม่พบเอกสาร');for(const ref of refs)tx.update(ref,{deleted,updatedBy:user.id,updatedAt:FieldValue.serverTimestamp()})});return true;}
 throw new HttpsError('unimplemented','ฟังก์ชันนี้ยังไม่เปิดใช้งานบน Firebase');
 }catch(error){if(error instanceof HttpsError)throw error;throw new HttpsError('failed-precondition',error.message||'ดำเนินการไม่สำเร็จ')}});
