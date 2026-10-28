const {test}=require('node:test'),assert=require('node:assert/strict'),{member,authorizeMethod}=require('../shared-membership'),{grants}=require('../school-roles');
const auth={uid:'u',token:{email:'u@example.invalid',email_verified:true,firebase:{sign_in_provider:'google.com'}}};
const db=p=>({doc:path=>({get:async()=>({exists:path==='school_users/u',data:()=>path==='school_users/u'?p:undefined})})});
test('all roles read; budget/deputy edit ledger; procurement edits only procurement/disbursement',async()=>{
 for(const role of ['admin','director','deputy','teacher','timetable','budget','procurement','student_support']){
  const user=await member(db({active:true,...grants(role)}),auth);
  for(const m of ['getBudgetRegister','listBudgetDocuments','listProcurementDocuments','openProcurementDocument'])assert.doesNotThrow(()=>authorizeMethod(user,m));
  for(const [method,args,allowed]of [['saveBudgetEntry',[],['admin','deputy','budget']],['saveBudgetDocument',['forms'],['admin','director','deputy','teacher','timetable','budget','procurement','student_support']],['saveBudgetDocument',['disbursements'],['admin','deputy','budget','procurement']],['saveProcurementDocument',[],['admin','deputy','budget','procurement']],['purgeBudgetDocuments',[],['admin','budget']],['setBudgetDocumentsDeleted',[],['admin','budget']],['setProcurementDocumentDeleted',[],['admin']],['mutateBudgetEntry',[{action:'delete'}],['admin']]]){
   if(allowed.includes(role))assert.doesNotThrow(()=>authorizeMethod(user,method,args));else assert.throws(()=>authorizeMethod(user,method,args),{code:'permission-denied'});
  }
 }
});
test('unified role overrides spoofed legacy editor flags',async()=>{const u=await member(db({active:true,...grants('director'),budgetRole:'admin'}),auth);assert.equal(u.canWriteBudget,false);assert.throws(()=>authorizeMethod(u,'saveBudgetEntry'),{code:'permission-denied'});});
