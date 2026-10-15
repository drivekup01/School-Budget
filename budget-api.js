if(!window.budgetRpcReady){
/* Use a narrowly scoped Apps Script iframe bridge from the GitHub-hosted form. */
window.budgetRpcReady=(async()=>{
 if(window.google?.script?.run)return(method,...args)=>new Promise((resolve,reject)=>google.script.run.withSuccessHandler(resolve).withFailureHandler(reject)[method](...args));
 const response=await fetch('https://drivekup01.github.io/School-Budget/budget-workbooks.json',{cache:'default'});if(!response.ok)throw Error('โหลดตัวเชื่อมข้อมูลไม่สำเร็จ');const config=await response.json();
 return new Promise((resolve,reject)=>{
  const frame=document.createElement('iframe');frame.hidden=true;frame.id='schoolBudgetBridge';frame.title='ตัวเชื่อมทะเบียนงบประมาณ';let peer,origin;const pending=new Map();let timer=setTimeout(()=>{reject(Error('เชื่อมต่อ Sheet ไม่สำเร็จ กรุณาโหลดใหม่'));frame.remove()},45000);
  window.addEventListener('message',e=>{if(!/^https:\/\/[a-zA-Z0-9-]+\.googleusercontent\.com$/.test(e.origin)||e.data?.channel!=='school-budget')return;
   if(e.data.type==='ready'&&!peer){peer=e.source;origin=e.origin;clearTimeout(timer);resolve((method,...args)=>new Promise((ok,no)=>{const requestId=crypto.randomUUID();const timeout=setTimeout(()=>{pending.delete(requestId);no(Error('การเชื่อมต่อใช้เวลานาน กรุณาโหลดข้อมูลล่าสุดก่อนลองอีกครั้ง'))},45000);pending.set(requestId,{ok,no,timeout});peer.postMessage({channel:'school-budget',requestId,method,args},origin)}));return}
   if(e.source!==peer||e.origin!==origin)return;const item=pending.get(e.data.requestId);if(!item)return;clearTimeout(item.timeout);pending.delete(e.data.requestId);if(e.data.error)item.no(Error(e.data.error));else item.ok(e.data.result);
  });frame.src=config.entryUrl+'?bridge=1';if(document.body)document.body.append(frame);else document.addEventListener('DOMContentLoaded',()=>document.body.append(frame),{once:true});
 });
})();
window.budgetRpcReady.catch(()=>{});

}