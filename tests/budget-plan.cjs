const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const root=path.join(__dirname,'..');
const data=JSON.parse(fs.readFileSync(path.join(root,'budget-plan-2570.json'),'utf8'));
const cents=n=>Math.round(n*100);
assert.equal(data.projects.length,40);
assert.equal(data.projects.reduce((n,p)=>n+p.activities.length,0),94);
assert.equal(data.incomeTotals.reduce((n,v)=>n+cents(v),0),324183938);
for(const p of data.projects){
 assert(p.remaining.every(v=>v===null));
 if(p.activities.length)for(let i=0;i<4;i++)assert.equal(cents(p.amounts[i]),p.activities.reduce((n,a)=>n+cents(a.amounts[i]),0));
}
for(const d of data.departments)for(let i=0;i<4;i++)assert.equal(cents(d.income[i]),data.projects.filter(p=>p.department===d.name).reduce((n,p)=>n+cents(p.amounts[i]),0));
let calls=0;
const ctx={window:{budgetYearDataUrl:'budget-plan-2570.json',budgetRpcReady:Promise.resolve(()=>{calls++;throw Error('Plan must not read old registers')})},fetch:async()=>({ok:true,json:async()=>structuredClone(data)})};
vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(root,'budget-live-data.js'),'utf8'),ctx);
(async()=>{const result=await ctx.window.loadBudgetData();assert.equal(calls,0);assert.deepEqual(result,data);console.log('PASS: 40 projects, 94 activities, reconciled allocations, unknown balances, no legacy register overlay');})().catch(e=>{console.error(e);process.exitCode=1});
