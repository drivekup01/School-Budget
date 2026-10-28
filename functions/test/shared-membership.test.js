const {test}=require('node:test'),assert=require('node:assert/strict'),{member,authorizeMethod}=require('../shared-membership');
const a={uid:'u',token:{email:'u@example.invalid',email_verified:true,firebase:{sign_in_provider:'google.com'}}};
const db=rows=>({doc:path=>({get:async()=>({exists:!!rows[path],data:()=>rows[path]})})});
test('legacy budget users retain access before central migration',async()=>{const p=await member(db({'budget_users/u':{active:true,email:a.token.email,role:'editor',name:'Old'}}),a);assert.equal(p.role,'editor');});
test('central grants are authoritative; old admin cannot bypass central denial or suspension',async()=>{const legacy={active:true,email:a.token.email,role:'admin'};for(const central of [{active:true,budgetRole:'none'},{active:false,budgetRole:'admin'}])await assert.rejects(member(db({'budget_users/u':legacy,'school_users/u':central}),a),e=>e.code==='permission-denied');});
test('new centrally approved editor works without duplicate budget_users profile',async()=>{const p=await member(db({'school_users/u':{active:true,budgetRole:'editor',name:'Central'}}),a);assert.equal(p.role,'editor');assert.equal(p.canWriteBudget,true);});
test('academic role or forged Google claims never grant budget editing',async()=>{await assert.rejects(member(db({'school_users/u':{active:true,timetableRole:'academic',budgetRole:'none'}}),a));await assert.rejects(member(db({}),{...a,token:{...a.token,email_verified:false}}),e=>e.code==='unauthenticated');});

test('approved legacy teachers without a budget role can create both forms while financial and other document access stays denied',async()=>{
 for(const fields of [{attendanceRole:'teacher'},{role:'teacher',budgetRole:'none'}]){
  const u=await member(db({'school_users/u':{active:true,...fields},'budget_users/u':{active:true,role:'admin'}}),a);
  assert.equal(u.canCreateBudgetForms,true);assert.equal(u.role,'viewer');assert.equal(u.canWriteBudget,false);assert.equal(u.canWriteDocuments,false);
  for(const method of ['listBudgetDocuments','saveBudgetDocument'])assert.doesNotThrow(()=>authorizeMethod(u,method,['forms']));
  for(const method of ['saveBudgetEntry','mutateBudgetEntry','purgeBudgetDocuments','getBudgetRegister','listProcurementDocuments'])assert.throws(()=>authorizeMethod(u,method),{code:'permission-denied'});
  assert.throws(()=>authorizeMethod(u,'saveBudgetDocument',['disbursements']),{code:'permission-denied'});
 }
 await assert.rejects(member(db({'school_users/u':{active:false,attendanceRole:'teacher'}}),a));
});
