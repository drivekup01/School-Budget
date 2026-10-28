const {test}=require('node:test'),assert=require('node:assert/strict'),F=require('../budget-forms'),M=require('../model');
const id='11111111-1111-4111-8111-111111111111',user=(id,schoolRole='teacher')=>({id,schoolRole}),doc=()=>({id,year:2570,projectId:1,activity:'กิจกรรมหนึ่ง',documentKind:'one',requestAmount:'25',fields:{number1:'1/70',date1:'2026-10-28'}});
test('every active school role creates forms; creator is immutable, teachers edit only their own; budget manages all',()=>{
 for(const role of ['admin','director','deputy','teacher','timetable','budget','procurement','student_support']){const d=F.saved({...doc(),createdBy:'spoof'},null,user('a',role));assert.equal(d.createdBy,'a');assert.equal(d.status,'completed');}
 const d=F.saved(doc(),null,user('a'));assert.throws(()=>F.saved({...d,createdBy:'b'},d,user('b')),/เฉพาะเอกสาร/);assert.throws(()=>F.saved(d,d,user('deputy','deputy')),/เฉพาะเอกสาร/);
 for(const role of ['budget','admin']){const edit=F.saved({...d,createdBy:'spoof',requestAmount:'50'},d,user('b',role));assert.equal(edit.createdBy,'a');assert.equal(edit.savedBy,'b');assert.ok(F.editable(user('a'),edit));}
 assert.equal(F.editable(user('a'),{savedBy:'a'}),true);assert.equal(F.editable(user('a'),{}),false);
});
test('document saves preserve historic posting evidence and never invoke financial operations',()=>{
 const old={...F.saved(doc(),null,user('a')),ledgerPosted:{row:5,amount:25}};
 const next=F.saved({...old,requestAmount:'100',ledgerPosted:{row:9,amount:100}},old,user('a'));assert.deepEqual(next.ledgerPosted,old.ledgerPosted);assert.equal(next.requestAmount,'100');
 const fresh=F.saved({...doc(),ledgerPending:{spent:25},ledgerPosted:{row:5}},null,user('a'));assert.equal(fresh.ledgerPending,undefined);assert.equal(fresh.ledgerPosted,undefined);
 assert.throws(()=>F.prohibitLegacyPosting({note:'เอกสารงบ 1 ['+id+']'}),/เอกสารเท่านั้น/);
 assert.throws(()=>F.saved({...doc(),fields:{}},null,user('a')));assert.deepEqual(F.references({...doc(),draftOnly:true}),[]);
});
test('ledger references resolve completed documents in the same project/activity and retain snapshots after deletion',async()=>{
 let d=F.saved(doc(),null,user('a')),deleted=false,exists=true;const db={doc:path=>path},tx={get:async path=>({exists:exists&&path==='budget_documents/forms-'+id,data:()=>({json:JSON.stringify(d),deleted})})};
 const state={year:2570,projectId:1,blocks:[{headerRow:2,activity:'กิจกรรมหนึ่ง',entries:[]}]},input={headerRow:2,documentReferences:[{id,kind:'one',number:'spoof'}]};await F.resolveReferences(tx,db,input,state);assert.equal(input.documentReferences[0].number,'1/70');
 d.projectId=2;await assert.rejects(F.resolveReferences(tx,db,{headerRow:2,documentReferences:[{id,kind:'one'}]},state),/เดียวกัน/);d.projectId=1;
 d.draftOnly=true;await assert.rejects(F.resolveReferences(tx,db,{headerRow:2,documentReferences:[{id,kind:'one'}]},state));delete d.draftOnly;
 state.blocks[0].entries=[{row:3,documentReferences:input.documentReferences}];exists=false;
 await F.resolveReferences(tx,db,{action:'edit',row:3,headerRow:2,documentReferences:[{id,kind:'one'}]},state);
 await assert.rejects(F.resolveReferences(tx,db,{headerRow:2,documentReferences:[{id,kind:'one'}]},state),/ถูกลบ/);
});
test('linking or clearing references during ledger edits never double counts expense',()=>{
 const s={revision:'r',blocks:[{headerRow:2,current:100,openingBalance:100,entries:[]}]},base={revision:'r',headerRow:2,number:'1',date:'2026-10-28',description:'วัสดุ',spent:25,note:'',documentReferences:[{id,kind:'one',number:'1/70'}]};
 const result=M.saveEntry(s,base);assert.equal(s.blocks[0].current,75);M.mutateEntry(s,{...base,revision:s.revision,action:'edit',row:result.row,documentReferences:[]});assert.equal(s.blocks[0].current,75);assert.deepEqual(s.blocks[0].entries[0].documentReferences,[]);
});
