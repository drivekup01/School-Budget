/* Public summaries render immediately; financial actions still request fresh data. */
(() => {
 let basePending,pending,previewPending,inFlight=false,refreshAfterWrite=false;
 const cacheKey='school-budget-summary-'+(window.budgetYear||2569);
 let displayed=null;
 function saved(){try{const v=JSON.parse(localStorage.getItem(cacheKey)||'null');return v?.data?.year===(window.budgetYear||2569)?v:null;}catch{return null;}}
 function keep(data){displayed=data;try{localStorage.setItem(cacheKey,JSON.stringify({savedAt:Date.now(),data}));}catch{}}
 window.addEventListener('storage',e=>{if(e.key==='school-budget-change-'+(window.budgetYear||2569))latest(false,true,true).catch(()=>{});});
 if(typeof document!=='undefined')setInterval(()=>{if(!document.hidden)latest(false,true).catch(()=>{});},60000);
 const add=(base,delta)=>base==null?null:Math.round((base+delta)*100)/100;
 function base(){return basePending||(basePending=window.fetchBudgetYearData(window.budgetYear||2569).catch(e=>{basePending=null;throw e}));}
 function status(message,busy=false){
  if(typeof document==='undefined'||!document.querySelector('#overview,#projects'))return;
  let host=document.getElementById('budgetDataStatus');
  if(!host){host=document.createElement('div');host.id='budgetDataStatus';host.style.cssText='display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin:12px 0 20px;font-size:13px;color:#65467d';const text=document.createElement('span');text.setAttribute('role','status');text.setAttribute('aria-live','polite');const button=document.createElement('button');button.type='button';button.textContent='อ่านยอดล่าสุด';button.style.cssText='font:inherit;border:1px solid #d8c4e8;border-radius:8px;padding:7px 12px;background:white;color:#65467d;cursor:pointer';button.onclick=()=>latest(true).catch(()=>{});host.append(text,button);document.querySelector('main header').after(host);}
  host.firstChild.textContent=message;host.lastChild.disabled=busy;
 }
 function notify(data){displayed=data;if(typeof CustomEvent!=='undefined')window.dispatchEvent(new CustomEvent('budget-data-updated',{detail:data}));}
 function latest(force=false,refresh=false,afterWrite=false){
  if(inFlight&&pending){if(force||afterWrite)refreshAfterWrite=true;return pending;}
  if(force||refresh){pending=null;}
  return pending||(inFlight=true,pending=(async()=>{
   let original=await base();if(original.year===2570)status('กำลังอ่านข้อมูลจริงปี 2570 จาก Google Sheets…',true);if([2569,2570].includes(original.year)){original=await window.fetchBudgetYearData(original.year,{live:true,force,refresh});}if(original.status==='empty'){status('ยังไม่มีข้อมูลปีการศึกษานี้');notify(original);return original;}if(original.status==='sheet-registers'){keep(original);status('ยอดล่าสุด '+new Date().toLocaleTimeString('th-TH',{timeZone:'Asia/Bangkok'})+' · ตรวจอัตโนมัติทุก 1 นาที');notify(original);return original;}if(original.status==='allocation-plan')return original;if(original.status==='imported'){status('ข้อมูลนำเข้า '+original.snapshotDate+' · เวอร์ชัน '+original.importRevision.slice(0,8));notify(original);return original;}
   status('แสดงข้อมูลนำเข้า ณ '+(original.snapshotDate||'ไม่ระบุ')+' · กำลังอ่านยอดล่าสุดจาก Sheet…',true);
   const data=JSON.parse(JSON.stringify(original));const rpc=await window.budgetRpcReady;const summary=await rpc('getBudgetAdjustmentSummary',data.year);if(summary.year!==data.year)throw Error('ปีของข้อมูลการยืมไม่ตรงกัน');
  const names=['เงินอุดหนุนรายหัว','เงินกิจกรรมพัฒนาผู้เรียน','เงินรายได้สถานศึกษา','อื่น ๆ'];
  for(const department of data.departments){department.adjustedIncome=department.income.slice();}
  for(const project of data.projects){const adjustment=summary.projects[project.id];project.adjustedIncome=project.income.slice();if(!adjustment)continue;const department=data.departments.find(d=>d.name===project.department);
   adjustment.delta.forEach((delta,i)=>{const previous=project.remaining[i];if(delta)project.adjustedIncome[i]=add(project.adjustedIncome[i]??adjustment.receipts?.[i]??(project.amounts[i]||0),delta);project.remaining[i]=adjustment.current?.[i]??add(previous,delta);if(department){if(delta)department.adjustedIncome[i]=add(department.adjustedIncome[i]??0,delta);const change=previous!=null&&project.remaining[i]!=null?project.remaining[i]-previous:delta;department.remaining[i]=add(department.remaining[i],change);}});
   for(const block of Object.values(adjustment.blocks)){if(!block.activity||!block.delta)continue;const i=names.indexOf(block.budgetType),activity=project.activities.find(a=>a.name===block.activity||a.name.endsWith(block.activity));if(i<0||!activity)continue;activity.adjustedAmounts=activity.adjustedAmounts||activity.amounts.slice();activity.adjustedAmounts[i]=add(activity.adjustedAmounts[i],block.delta);activity.adjustedIncome=activity.adjustedIncome||(activity.income&&activity.income.some(v=>v!==null)?activity.income.slice():activity.amounts.slice());activity.adjustedIncome[i]=add(activity.adjustedIncome[i],block.delta);if(activity.remaining)activity.remaining[i]=add(activity.remaining[i],block.delta);}
  }

   const savedAt=Date.now();keep(data);
   status('อ่านยอดล่าสุดแล้ว '+new Date(savedAt).toLocaleTimeString('th-TH',{timeZone:'Asia/Bangkok'}));notify(data);return data;
  })().catch(e=>{pending=null;status('ตรวจยอดล่าสุดไม่สำเร็จ · ยอดที่แสดงยังเป็นข้อมูลสรุปเดิม กรุณากดอ่านยอดล่าสุด');throw e}).finally(()=>{inFlight=false;if(refreshAfterWrite){refreshAfterWrite=false;pending=null;latest(false,true).catch(()=>{});}}));
 }
 window.loadBudgetData=(options={})=>{
  if(options.baseOnly)return base();
  if(!options.preview)return latest();
  return previewPending||(previewPending=(async()=>{
   const original=await base();const cached=saved();if(cached){latest().catch(()=>{});status('แสดงยอดสรุปที่อ่านล่าสุด · กำลังตรวจข้อมูลใหม่…');return cached.data;}if(original.status==='empty'){status('ยังไม่มีข้อมูลปีการศึกษานี้');return original;}if(original.status==='imported'){status('ข้อมูลนำเข้า '+original.snapshotDate+' · เวอร์ชัน '+original.importRevision.slice(0,8));return original;}if(original.status==='sheet-registers'){status('แสดงยอดทะเบียนปี '+original.year+' · กำลังอ่านยอดล่าสุด…');latest().catch(()=>{});return original;}if(original.status==='allocation-plan'){status('แผนงบประมาณปี '+original.year);return original;}
   try{const cached=JSON.parse(localStorage.getItem(cacheKey)||'null');const age=Date.now()-cached?.savedAt;if(cached?.data?.year===original.year&&cached.data.snapshotDate===original.snapshotDate&&age>=0&&age<60000){status('ข้อมูลที่อ่านล่าสุด '+new Date(cached.savedAt).toLocaleTimeString('th-TH',{timeZone:'Asia/Bangkok'})+' · เก็บไว้ไม่เกิน 1 นาที');return cached.data;}}catch{}
   status('ข้อมูลนำเข้า ณ '+(original.snapshotDate||'ไม่ระบุ')+' · กำลังอ่านยอดล่าสุด…',true);
   latest().catch(()=>{});return original;
  })().catch(e=>{previewPending=null;throw e}));
 };
})();
