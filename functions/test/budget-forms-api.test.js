const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),{createRequire}=require('node:module'),{grants}=require('../school-roles');
function harness(){
 const data=new Map(),native=createRequire(require.resolve('../index')),exports={};let writes=[];
 const snap=path=>({exists:data.has(path),data:()=>data.get(path)}),ref=path=>({path,get:async()=>snap(path)});
 const db={doc:ref,collection:path=>({doc:()=>ref(path+'/'+Math.random()),where:(key,op,v)=>({get:async()=>({docs:[...data].filter(([p,d])=>p.startsWith(path+'/')&&d[key]===v).map(([p])=>snap(p))})})}),runTransaction:async fn=>{const changes=[];const tx={get:async r=>snap(r.path),set:(r,v)=>changes.push(['set',r.path,v]),create:(r,v)=>changes.push(['set',r.path,v]),update:(r,v)=>changes.push(['update',r.path,v]),delete:r=>changes.push(['delete',r.path])};const result=await fn(tx);for(const [op,p,v]of changes){if(op==='delete')data.delete(p);else data.set(p,op==='update'?{...data.get(p),...v}:v)}writes.push(...changes);return result}};
 class HttpsError extends Error{constructor(code,msg){super(msg);this.code=code}}
 const mocks={'firebase-functions/v2/https':{onCall:(opts,fn)=>fn,HttpsError},'firebase-admin/app':{getApps:()=>[{}],initializeApp:()=>{}},'firebase-admin/firestore':{getFirestore:()=>db,FieldValue:{serverTimestamp:()=>null}}};
 vm.runInNewContext(fs.readFileSync(require.resolve('../index'),'utf8'),{exports,require:name=>mocks[name]||native(name),Buffer});
 const api=async(uid,role,method,...args)=>{data.set('school_users/'+uid,{active:true,name:uid,...grants(role)});return exports.budgetApi({auth:{uid,token:{email:uid+'@example.invalid',email_verified:true,firebase:{sign_in_provider:'google.com'}}},data:{method,args}})};
 return {data,api,get writes(){return writes}};
}
const id='11111111-1111-4111-8111-111111111111',form=()=>({id,year:2570,projectId:1,documentKind:'two',requestAmount:'25',fields:{number2:'1/70',date2:'2026-10-28'}});
test('actual API permits teacher create, enforces immutable ownership and stale edits, budget purge, and no ledger writes',async()=>{
 const h=harness(),d=await h.api('a','teacher','saveBudgetDocument','forms',{...form(),createdBy:'b'});assert.equal(d.createdBy,'a');
 await assert.rejects(h.api('b','teacher','saveBudgetDocument','forms',d));
 const edit=await h.api('budget','budget','saveBudgetDocument','forms',{...d,requestAmount:'50'});assert.equal(edit.createdBy,'a');assert.equal(edit.requestAmount,'50');
 // A stale timestamp must never overwrite a newer revision.
 await assert.rejects(h.api('a','teacher','saveBudgetDocument','forms',{...edit,savedAt:'2020-01-01'}),/ล่าสุด/);
 const list=await h.api('b','teacher','listBudgetDocumentReferences',2570,1);assert.equal(list.length,1);assert.equal(list[0].number,'1/70');
 await assert.rejects(h.api('a','teacher','purgeBudgetDocuments',[id]));
 await h.api('budget','budget','purgeBudgetDocuments',[id]);assert.equal(h.data.has('budget_documents/forms-'+id),false);
 assert.ok(h.writes.every(([,p])=>p.startsWith('budget_documents/')));
});

function seed(h){const state={year:2570,projectId:1,sheetName:'โครงการทดสอบ',revision:'r',borrowing:[],blocks:[{headerRow:2,blockIndex:0,activity:'กิจกรรมทดสอบ',budgetType:'เงินอุดหนุนรายหัว',received:100,openingBalance:100,current:100,used:0,entries:[]}]};const summary={projects:[{id:1,department:'ฝ่ายทดสอบ',activities:[{name:'กิจกรรมทดสอบ'}]}],departments:[{name:'ฝ่ายทดสอบ'}]};h.data.set('budget_registers/2570-1',{json:JSON.stringify(state)});h.data.set('budget_public_years/2570',{json:JSON.stringify(summary)});return state;}
const one=()=>({...form(),documentKind:'one',activity:'กิจกรรมทดสอบ',fund:'เงินอุดหนุนรายหัว',fields:{number1:'1/70',date1:'2026-11-03'}});
const register=h=>JSON.parse(h.data.get('budget_registers/2570-1').json);
test('saving form one atomically posts once, updates same expense on edit, form two never posts',async()=>{
 const h=harness();seed(h);let d=await h.api('a','teacher','saveBudgetDocument','forms',one());assert.equal(register(h).blocks[0].current,75);assert.equal(d.ledgerPosted.amount,25);
 d=await h.api('a','teacher','saveBudgetDocument','forms',d);assert.equal(register(h).blocks[0].entries.length,1);assert.equal(register(h).blocks[0].current,75);
 d=await h.api('a','teacher','saveBudgetDocument','forms',{...d,requestAmount:'40'});assert.equal(register(h).blocks[0].current,60);assert.equal(register(h).blocks[0].entries.length,1);
 await h.api('a','teacher','saveBudgetDocument','forms',{...form(),id:'22222222-2222-4222-8222-222222222222'});assert.equal(register(h).blocks[0].current,60);
 await assert.rejects(h.api('a','teacher','saveBudgetDocument','forms',{...d,requestAmount:'101'}),/เพียงพอ/);assert.equal(register(h).blocks[0].current,60);assert.equal(JSON.parse(h.data.get('budget_documents/forms-'+id).json).requestAmount,'40');
 assert.equal(JSON.parse(h.data.get('budget_public_years/2570').json).projects[0].remaining[0],60);
});
test('old document-only history is untouched until explicitly saved; matching manual expense is adopted without double posting',async()=>{
 const h=harness(),state=seed(h),old={...one(),createdBy:'a',savedBy:'a',savedAt:'2026-10-28'};h.data.set('budget_documents/forms-'+id,{kind:'forms',json:JSON.stringify(old)});
 await h.api('a','teacher','listBudgetDocuments','forms');assert.equal(register(h).blocks[0].current,100);
 const M=require('../model');M.saveEntry(state,{headerRow:2,revision:state.revision,number:'1/70',date:'2026-11-03',description:'วัสดุ',spent:25,note:''});h.data.set('budget_registers/2570-1',{json:JSON.stringify(state)});
 const d=await h.api('a','teacher','saveBudgetDocument','forms',old);assert.ok(d.ledgerPosted);assert.equal(register(h).blocks[0].current,75);assert.equal(register(h).blocks[0].entries.length,1);
});

test('disbursement and procurement APIs protect immutable owners; budget department edits and deletes',async()=>{
 const h=harness(),pay=await h.api('a','teacher','saveBudgetDocument','disbursements',{id,employee:'Synthetic',createdBy:'forged'});assert.equal(pay.createdBy,'a');await assert.rejects(h.api('b','teacher','saveBudgetDocument','disbursements',pay));const changed=await h.api('finance','budget','saveBudgetDocument','disbursements',{...pay,employee:'Updated'});assert.equal(changed.createdBy,'a');await assert.rejects(h.api('a','teacher','setDisbursementDocumentsDeleted',[id],true));await h.api('finance','budget','setDisbursementDocumentsDeleted',[id],true);assert.equal(h.data.get('budget_documents/disbursements-'+id).deleted,true);
 const P=require('../procurement'),data={format:'school-procurement-document-v1',version:1,name:'Synthetic',academicYear:2570,stores:Object.fromEntries(P.keys.map(k=>[k,{}])),createdBy:'forged'};const first=await h.api('a','teacher','saveProcurementDocument',data,'test-procurement');assert.equal(first.createdBy,'a');const opened=await h.api('b','teacher','openProcurementDocument','test-procurement');assert.equal(opened.canEdit,false);await assert.rejects(h.api('b','teacher','saveProcurementDocument',opened.data,'test-procurement',{expectedSavedAt:first.savedAt}));const edit=await h.api('finance','budget','saveProcurementDocument',opened.data,'test-procurement',{expectedSavedAt:first.savedAt});assert.equal(edit.createdBy,'a');await assert.rejects(h.api('a','teacher','setProcurementDocumentDeleted','test-procurement',true));await h.api('finance','budget','setProcurementDocumentDeleted','test-procurement',true);assert.equal(h.data.get('budget_documents/procurement-test-procurement').deleted,true);
});

function addMoveTarget(h,year,projectId,amount=100){
 const state=register(h);
 state.year=year;
 state.projectId=projectId;
 state.blocks[0]={...state.blocks[0],openingBalance:amount,received:amount,current:amount,used:0,entries:[]};
 h.data.set('budget_registers/'+year+'-'+projectId,{json:JSON.stringify(state)});
 const key='budget_public_years/'+year;
 const summary=h.data.has(key)?JSON.parse(h.data.get(key).json):{projects:[],departments:[{name:'ฝ่ายทดสอบ'}]};
 summary.projects.push({id:projectId,department:'ฝ่ายทดสอบ',activities:[{name:'กิจกรรมทดสอบ'}]});
 h.data.set(key,{json:JSON.stringify(summary)});
}

test('moving a posted form across years returns the original amount and posts the edited amount atomically',async()=>{
 const h=harness();seed(h);addMoveTarget(h,2569,2);
 const d=await h.api('a','teacher','saveBudgetDocument','forms',one());
 const move={...d,year:2569,projectId:2,requestAmount:'40'};
 await assert.rejects(h.api('a','teacher','saveBudgetDocument','forms',move),/เฉพาะฝ่ายงบประมาณ/);
 await assert.rejects(h.api('budget','budget','saveBudgetDocument','forms',{...move,requestAmount:'101'}),/เพียงพอ/);
 assert.equal(register(h).blocks[0].current,75);
 const saved=await h.api('budget','budget','saveBudgetDocument','forms',move);
 assert.equal(saved.ledgerPosted.year,2569);
 assert.equal(saved.ledgerPosted.projectId,2);
 assert.equal(saved.ledgerPosted.amount,40);
 assert.equal(saved.createdBy,'a');
 assert.equal(register(h).blocks[0].current,100);
 assert.equal(register(h).blocks[0].entries.length,0);
 assert.equal(JSON.parse(h.data.get('budget_registers/2569-2').json).blocks[0].current,60);
 assert.equal(JSON.parse(h.data.get('budget_public_years/2570').json).projects[0].remaining[0],100);
 assert.equal(JSON.parse(h.data.get('budget_public_years/2569').json).projects[0].remaining[0],60);
 const retry=await h.api('budget','budget','saveBudgetDocument','forms',saved);
 assert.equal(retry.ledgerPosted.row,saved.ledgerPosted.row);
 assert.equal(JSON.parse(h.data.get('budget_registers/2569-2').json).blocks[0].entries.length,1);
});

test('moves between activities in the same register without counting the old amount as available in the destination',async()=>{
 const h=harness(),state=seed(h),key='budget_public_years/2570';
 state.blocks.push({...state.blocks[0],headerRow:20,blockIndex:1,activity:'ปลายทาง',openingBalance:20,received:20,current:20,entries:[]});
 h.data.set('budget_registers/2570-1',{json:JSON.stringify(state)});
 const summary=JSON.parse(h.data.get(key).json);
 summary.projects[0].activities.push({name:'ปลายทาง'});
 h.data.set(key,{json:JSON.stringify(summary)});
 const d=await h.api('budget','budget','saveBudgetDocument','forms',one());
 await assert.rejects(h.api('budget','budget','saveBudgetDocument','forms',{...d,activity:'ปลายทาง'}),/เพียงพอ/);
 const saved=await h.api('budget','budget','saveBudgetDocument','forms',{...d,activity:'ปลายทาง',requestAmount:'15'});
 assert.equal(saved.finance.activityCurrent,20);
 assert.deepEqual(register(h).blocks.map(b=>b.current),[100,5]);
 assert.deepEqual(JSON.parse(h.data.get(key).json).projects[0].activities.map(a=>a.remaining[0]),[100,5]);
});

test('moves across projects in the same year and updates both projects in the shared summary',async()=>{
 const h=harness();seed(h);addMoveTarget(h,2570,2);
 const d=await h.api('budget','budget','saveBudgetDocument','forms',one());
 await h.api('budget','budget','saveBudgetDocument','forms',{...d,projectId:2});
 const summary=JSON.parse(h.data.get('budget_public_years/2570').json);
 assert.deepEqual(summary.projects.map(p=>p.remaining[0]),[100,75]);
 assert.equal(summary.departments[0].remaining[0],175);
});
