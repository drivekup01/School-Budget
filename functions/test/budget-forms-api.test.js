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
const id='11111111-1111-4111-8111-111111111111',form=()=>({id,year:2570,projectId:1,documentKind:'one',requestAmount:'25',fields:{number1:'1/70',date1:'2026-10-28'}});
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
