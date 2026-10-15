/* Imported base + one committed borrowing journal, shared by all page views. */
(() => {
 let pending;
 const add=(base,delta)=>base==null?null:Math.round((base+delta)*100)/100;
 window.loadBudgetData=()=>pending||(pending=(async()=>{
  const response=await fetch(window.budgetYearDataUrl||'budget-data.json',{cache:'default'});if(!response.ok)throw Error('โหลดข้อมูลงบประมาณไม่สำเร็จ');const data=await response.json();
  const rpc=await window.budgetRpcReady;const summary=await rpc('getBudgetAdjustmentSummary',data.year);if(summary.year!==data.year)throw Error('ปีของข้อมูลการยืมไม่ตรงกัน');
  const names=['เงินอุดหนุนรายหัว','เงินกิจกรรมพัฒนาผู้เรียน','เงินรายได้สถานศึกษา','อื่น ๆ'];
  for(const department of data.departments){department.adjustedIncome=department.income.slice();}
  for(const project of data.projects){const adjustment=summary.projects[project.id];project.adjustedIncome=project.income.slice();if(!adjustment)continue;const department=data.departments.find(d=>d.name===project.department);
   adjustment.delta.forEach((delta,i)=>{const previous=project.remaining[i];if(delta)project.adjustedIncome[i]=add(project.adjustedIncome[i]??adjustment.receipts?.[i]??(project.amounts[i]||0),delta);project.remaining[i]=adjustment.current?.[i]??add(previous,delta);if(department){if(delta)department.adjustedIncome[i]=add(department.adjustedIncome[i]??0,delta);const change=previous!=null&&project.remaining[i]!=null?project.remaining[i]-previous:delta;department.remaining[i]=add(department.remaining[i],change);}});
   for(const block of Object.values(adjustment.blocks)){if(!block.activity||!block.delta)continue;const i=names.indexOf(block.budgetType),activity=project.activities.find(a=>a.name===block.activity||a.name.endsWith(block.activity));if(i<0||!activity)continue;activity.adjustedAmounts=activity.adjustedAmounts||activity.amounts.slice();activity.adjustedAmounts[i]=add(activity.adjustedAmounts[i],block.delta);activity.adjustedIncome=activity.adjustedIncome||(activity.income&&activity.income.some(v=>v!==null)?activity.income.slice():activity.amounts.slice());activity.adjustedIncome[i]=add(activity.adjustedIncome[i],block.delta);if(activity.remaining)activity.remaining[i]=add(activity.remaining[i],block.delta);}
  }
  return data;
 })());
})();
