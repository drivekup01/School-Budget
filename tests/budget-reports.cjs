const assert=require('node:assert/strict');
const {sum,build}=require('../budget-reports-model');
const data={projects:[{id:1,department:'ฝ่าย ก',name:'โครงการ ก',income:[100],activities:[{name:'กิจกรรม ก',amounts:[60]},{name:'กิจกรรม ข',amounts:[40]}]},{id:2,department:'ฝ่าย ข',name:'โครงการ ข',income:[100],activities:[]}]};
const borrow={id:'b1',kind:'borrow',number:'1',date:'2026-10-17',source:{projectId:1,name:'โครงการ ก',activity:'กิจกรรม ก'},destination:{projectId:2,name:'โครงการ ข'},amount:20};
const states={1:{blocks:[{activity:'กิจกรรม ก',received:60,incoming:0,outgoing:20,used:10,current:30,entries:[{spent:10,description:'<script>test</script>'}]},{activity:null,received:40,incoming:0,outgoing:0,used:5,current:35,entries:[{spent:5}]}],borrowing:[borrow]},2:{blocks:[{received:100,incoming:20,outgoing:0,used:0,current:120}],borrowing:[borrow]}};
assert.equal(sum([null,1]),null);assert.equal(sum([]),null);assert.equal(sum([0,0]),0);assert.equal(sum([.1,.2]),.3);
let report=build(data,states);assert.equal(report.loans.length,1);assert.equal(report.details.length,2);assert.deepEqual(report.summaries[0].slice(4),[100,0,20,15,65]);
report=build(data,states,{project:'1',activity:'กิจกรรม ก'});assert.equal(report.details.length,1);assert.equal(report.summaries[0][8],30);
report=build(data,states,{project:'1',activity:'กิจกรรม ข'});assert.equal(report.details.length,0);assert.equal(report.summaries[0][8],null);
states[1].borrowing.push({...borrow,id:'cancel',kind:'cancel',referenceId:'b1'});states[2].borrowing=states[1].borrowing;assert.equal(build(data,states).loans[0][9],'ยกเลิกแล้ว');
assert.equal(build(data,{},{}).summaries[0][7],null);
console.log('Report calculations: missing values, no double deduction, activity scope, unique borrowing, cancellation passed');

// Each fund keeps its own total and source entries, including activity scope.
const mixed={projects:[{id:9,department:'ฝ่าย ก',name:'โครงการทดสอบ',income:[100,200,0,0],activities:[{name:'กิจกรรมทดสอบ',income:[100,200,0,0]}]}]};
const mixedStates={9:{blocks:[{activity:'กิจกรรมทดสอบ',budgetType:'เงินอุดหนุนรายหัว',received:100,incoming:0,outgoing:0,used:25,current:75,entries:[{number:'ก1',spent:25}]},{activity:'กิจกรรมทดสอบ',budgetType:'เงินกิจกรรมพัฒนาผู้เรียน',received:200,incoming:0,outgoing:0,used:90,current:110,entries:[{number:'ก2',spent:90}]}]}};
const split=build(mixed,mixedStates,{splitFunds:true});
assert.equal(split.summaries.length,4);
assert.deepEqual(split.summaries.slice(0,2).map(r=>[r[9],r[7],r[8]]),[['เงินอุดหนุนรายหัว',25,75],['เงินกิจกรรมพัฒนาผู้เรียน',90,110]]);
assert.equal(split.details.length,2);
assert.equal(split.details.reduce((n,r)=>n+r[8],0),115);
const scoped=build(mixed,mixedStates,{splitFunds:true,activity:'กิจกรรมทดสอบ',budgetType:'เงินอุดหนุนรายหัว'});
assert.equal(scoped.summaries.length,1);assert.equal(scoped.details[0][0],'ก1');assert.equal(scoped.summaries[0][7],25);
console.log('Fund-separated totals and source entries passed');
