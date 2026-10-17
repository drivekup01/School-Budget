const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const source=fs.readFileSync(require('path').join(__dirname,'../budget-live-data.js'),'utf8');
const original=JSON.parse(fs.readFileSync(require('path').join(__dirname,'../budget-data.json'),'utf8'));
const storage=new Map(),events=[];let calls=0,release;
const response=new Promise(resolve=>release=resolve);
function context(summary){const ctx={window:{budgetRpcReady:Promise.resolve(async()=>{calls++;return summary;}),dispatchEvent:e=>events.push(e)},fetch:async()=>({ok:true,json:async()=>structuredClone(original)}),sessionStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},CustomEvent:class{constructor(type,options){this.type=type;this.detail=options.detail;}}};vm.createContext(ctx);vm.runInContext(source,ctx);return ctx.window;}
(async()=>{
 const cold=context(response);const preview=await cold.loadBudgetData({preview:true});assert.equal(preview.year,2569);assert.equal(events.length,0,'base is usable before live RPC finishes');
 const full=cold.loadBudgetData();release({year:2569,projects:{}});const latest=await full;assert.equal(calls,1);assert.equal(events.length,1);assert.notStrictEqual(preview,latest,'refresh must not mutate visible base data');
 const warm=context(Promise.reject(new Error('not requested')).catch(()=>{}));await warm.loadBudgetData({preview:true});assert.equal(calls,1,'warm public navigation must reuse recent public summary');
 await warm.loadBudgetData({baseOnly:true});assert.equal(calls,1,'reports must not read redundant adjustment summary');
 let attempts=0;const retry=context({year:2570,projects:{}});await assert.rejects(retry.loadBudgetData(),/ปี/);retry.budgetRpcReady=Promise.resolve(async()=>{attempts++;return {year:2569,projects:{}};});await retry.loadBudgetData();assert.equal(attempts,1,'failed live reads are retryable');
 for(const [key,value] of storage){const c=JSON.parse(value);c.savedAt=Date.now()-61000;storage.set(key,JSON.stringify(c));}
 const expired=context({year:2569,projects:{}});await expired.loadBudgetData({preview:true});await expired.loadBudgetData();assert.equal(calls,3,'expired cache refreshes exactly once');
 console.log('PASS: immediate base, one live read, isolated refresh, warm cache, base-only reports, retry and cache expiry');
})().catch(e=>{console.error(e);process.exitCode=1});
