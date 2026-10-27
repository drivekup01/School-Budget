'use strict';
function deny(message,code='permission-denied'){throw Object.assign(new Error(message),{code});}
async function member(db,a){
 if(!a||a.token.email_verified!==true||a.token.firebase?.sign_in_provider!=='google.com')deny('กรุณาเข้าสู่ระบบด้วย Google','unauthenticated');
 const center=await db.doc('school_users/'+a.uid).get();
 if(center.exists){const p=center.data();const caps=require('./school-roles').capabilities(p);if(!p.active||(caps?!caps.active:!['admin','editor','viewer','procurement'].includes(p.budgetRole)))deny('บัญชีนี้ยังไม่ได้รับสิทธิ์ระบบงบประมาณ');const old=await db.doc('budget_users/'+a.uid).get();return {...old.data(),...p,id:a.uid,role:caps?(caps.admin?'admin':caps.editBudget?'editor':caps.editDocuments?'procurement':'viewer'):p.budgetRole,name:p.name,canWriteBudget:caps?caps.editBudget:['admin','editor'].includes(p.budgetRole),canWriteDocuments:caps?caps.editDocuments:['admin','editor','procurement'].includes(p.budgetRole)};}
 const snap=await db.doc('budget_users/'+a.uid).get(),p=snap.data();if(!p||!p.active||p.email!==a.token.email||!['admin','editor'].includes(p.role))deny('บัญชีนี้ยังไม่ได้รับสิทธิ์ระบบงบประมาณ');return {...p,id:a.uid,canWriteBudget:true,canWriteDocuments:true};
}
function authorizeMethod(user,method,args=[]){
 const reads=['getBudgetUser','getBudgetReferenceData','getBudgetProjectCatalog','listBorrowingBudgetDocuments','getBudgetRegister','getBudgetDocumentFinance','listBudgetDocuments','listProcurementDocuments','openProcurementDocument','getProcurementDraft'];
 if(reads.includes(method))return;
 if(['setBudgetDocumentsDeleted','setProcurementDocumentDeleted'].includes(method)||method==='mutateBudgetEntry'&&['delete','restore','purge'].includes(args[0]?.action)){if(user.role!=='admin')deny('เฉพาะผู้ดูแลระบบ');return;}
 if(['saveProcurementDocument','saveProcurementDraft','clearProcurementDraft'].includes(method)||method==='saveBudgetDocument'&&args[0]==='disbursements'){if(!user.canWriteDocuments)deny('บัญชีนี้ดูเอกสารได้อย่างเดียว');return;}
 if(['saveBudgetPlanningComment','saveBudgetEntry','mutateBudgetEntry','saveBudgetBorrowing','cancelBudgetBorrowing','saveBudgetDocument'].includes(method)){if(!user.canWriteBudget)deny('ไม่มีสิทธิ์แก้ไขงบประมาณ');return;}
 deny('ไม่รองรับคำสั่งนี้','invalid-argument');
}
module.exports={member,authorizeMethod};
