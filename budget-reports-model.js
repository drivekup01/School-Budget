/* Shared, read-only report calculations. Missing values remain missing. */
(function(root){
 const sum=values=>values.length&&values.every(Number.isFinite)?Math.round(values.reduce((n,v)=>n+v,0)*100)/100:null;
 const types=['เงินอุดหนุนรายหัว','เงินกิจกรรมพัฒนาผู้เรียน','เงินรายได้สถานศึกษา','อื่น ๆ'];
 const match=(name,activity)=>!!name&&(name===activity||'กิจกรรม'+name===activity||name==='กิจกรรม'+activity);
 function build(data,states,filter={}){
  if(filter.splitFunds){
   const funds=filter.budgetType?[filter.budgetType]:types;
   const parts=funds.map(budgetType=>({budgetType,model:build(data,states,{...filter,budgetType,splitFunds:false})}));
   return {summaries:parts.flatMap(({budgetType,model})=>model.summaries.map(r=>[...r,budgetType])),details:parts.flatMap(p=>p.model.details),detailTargets:parts.flatMap(p=>p.model.detailTargets),loans:parts.flatMap(p=>p.model.loans)};
  }
  const projects=data.projects.filter(p=>(!filter.department||p.department===filter.department)&&(!filter.project||String(p.id)===String(filter.project)));
  const summaries=[],details=[],detailTargets=[],loans=new Map();
  for(const p of projects){
   const state=states[p.id],blocks=(state?.blocks||[]).filter(b=>(!filter.activity||match(b.activity,filter.activity))&&(!filter.budgetType||b.budgetType===filter.budgetType));
   const units=filter.activity?p.activities.filter(a=>a.name===filter.activity):[p];
   for(const unit of units){const bs=blocks;const amounts=unit.income?.some(Number.isFinite)?unit.income:(unit.amounts||[]);const initial=filter.budgetType?[amounts[types.indexOf(filter.budgetType)]]:amounts;
    summaries.push([p.department,p.name,filter.activity||'ทุกกิจกรรม',sum(initial),sum(bs.map(b=>b.received)),sum(bs.map(b=>b.incoming)),sum(bs.map(b=>b.outgoing)),sum(bs.map(b=>b.used)),sum(bs.map(b=>b.current))]);
   }
   for(const b of blocks)for(const e of b.entries||[]){detailTargets.push({projectId:p.id,headerRow:b.headerRow,row:e.row,editable:!e.deleted&&e.spent>0});details.push([e.number,e.date,p.department,p.name,b.activity||'ยังไม่ระบุกิจกรรม',b.budgetType||'ไม่ระบุ',e.description,e.received||0,e.spent,e.remaining,e.note]);}
   const cancelled=new Set((state?.borrowing||[]).filter(r=>r.kind==='cancel').map(r=>r.referenceId));
   for(const r of state?.borrowing||[]){if(r.kind!=='borrow'||(filter.budgetType&&r.budgetType!==filter.budgetType))continue;if(filter.activity&&!['source','destination'].some(side=>r[side].projectId===p.id&&match(r[side].activity,filter.activity)))continue;
    loans.set(r.id,[r.number,r.date,r.source.name,r.source.activity||'',r.destination.name,r.destination.activity||'',r.budgetType,r.amount,r.reason,cancelled.has(r.id)?'ยกเลิกแล้ว':'บันทึกแล้ว']);}
  }
  return {summaries,details,detailTargets,loans:[...loans.values()]};
 }
 const api={sum,match,build};if(typeof module!=='undefined')module.exports=api;else root.BudgetReports=api;
})(typeof window==='undefined'?globalThis:window);
