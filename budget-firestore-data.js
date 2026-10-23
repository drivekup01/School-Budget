/* One small public snapshot; realtime updates replace per-minute whole-Sheet reads. */
(() => {
 const year=Number(window.budgetYear||2569);let pending,latest,stop;
 function showError(message){let host=document.getElementById('budgetDataError');if(!host){host=document.createElement('p');host.id='budgetDataError';host.className='error';host.setAttribute('role','alert');document.querySelector('main header')?.after(host)}host.textContent=message;host.hidden=!message}
 function receive(data){latest=data;const error=document.getElementById('budgetDataError');if(error)error.hidden=true;window.dispatchEvent(new CustomEvent('budget-data-updated',{detail:data}));}
 async function load(force=false){if(!force&&pending)return pending;pending=(async()=>{const client=await window.budgetFirebaseReady;const data=await client.readYear(year,force);receive(data);if(!stop)stop=client.watchYear(year,receive,()=>showError('เชื่อมต่อข้อมูลล่าสุดไม่สำเร็จ กรุณาโหลดหน้านี้ใหม่'));return data})().catch(e=>{pending=null;showError('โหลดข้อมูลไม่สำเร็จ กรุณาโหลดหน้านี้ใหม่');throw e});return pending}
 window.loadBudgetData=()=>load();window.addEventListener('pagehide',()=>{stop?.();stop=null},{once:true});
})();
