/* Shared validation for annual income allocations. No ledger mutations or I/O. */
(function(root){
 'use strict';
 const funds=['เงินอุดหนุนรายหัว','เงินกิจกรรมพัฒนาผู้เรียน','เงินรายได้สถานศึกษา','อื่น ๆ'];
 const departments=['ฝ่ายบริหารงานวิชาการ','ฝ่ายบริหารงานงบประมาณ','ฝ่ายบริหารงานบุคคล','ฝ่ายบริหารงานทั่วไป'];
 const clean=v=>String(v??'').replace(/\s+/g,' ').trim(),cents=v=>Math.round(v*100),money=v=>v/100;
 function fail(message){throw Error(message)}
 function text(v,max,required=true){if(typeof v!=='string'||v.length>max||required&&!clean(v))fail('ข้อความไม่ครบหรือยาวเกินกำหนด');return clean(v)}
 function amounts(v){if(!Array.isArray(v)||v.length!==4||v.some(n=>typeof n!=='number'||!Number.isFinite(n)||n<0||n>1e9||Math.abs(n*100-cents(n))>.0001))fail('จำนวนเงินต้องครบ 4 ประเภท ไม่ติดลบ และมีทศนิยมไม่เกิน 2 ตำแหน่ง');return v.map(n=>money(cents(n)))}
 function totals(projects){return funds.map((_,f)=>money(projects.reduce((s,p)=>s+cents(p.amounts[f]),0)))}
 function normalize(input){
  if(!input||input.schema!==1||input.kind!=='allocation'||!Number.isInteger(input.year)||input.year<2500||input.year>2700)fail('รูปแบบหรือปีงบประมาณไม่ถูกต้อง');
  if(!input.source||!/^([a-f0-9]{64})$/i.test(input.source.sha256||''))fail('ไม่พบรหัสตรวจสอบไฟล์ต้นฉบับ');
  const source={filename:text(input.source.filename,240),sheet:text(input.source.sheet,100),sha256:input.source.sha256.toLowerCase(),header:text(input.source.header,1000)};
  if(!Array.isArray(input.projects)||!input.projects.length||input.projects.length>200)fail('ต้องมีโครงการ 1–200 โครงการ');
  source.notes=(input.source.notes||[]).map(n=>text(n,500));if(source.notes.length>50)fail('หมายเหตุมากเกินกำหนด');
  let activities=0;const ids=new Set(),warnings=source.notes.slice();
  const projects=input.projects.map(p=>{
   if(!p||!Number.isInteger(p.id)||p.id<1||p.id>9999||ids.has(p.id))fail('รหัสโครงการไม่ถูกต้องหรือซ้ำ');ids.add(p.id);
   if(!departments.includes(p.department))fail('ฝ่ายงานไม่อยู่ใน 4 ฝ่ายมาตรฐาน');
   if(!Array.isArray(p.activities)||p.activities.length>500)fail('รายการกิจกรรมไม่ถูกต้อง');
   const names=new Set(),value={id:p.id,department:p.department,name:text(p.name,1000),owner:text(p.owner||'',500,false),amounts:amounts(p.amounts),sourceRow:Number.isInteger(p.sourceRow)?p.sourceRow:null,activities:p.activities.map(a=>{
    const name=text(a.name,1000);if(names.has(name))fail('กิจกรรมซ้ำในโครงการ '+p.id+': '+name);names.add(name);
    return {name,owner:text(a.owner||'',500,false),amounts:amounts(a.amounts),sourceRow:Number.isInteger(a.sourceRow)?a.sourceRow:null};
   })};
   if(value.activities.length&&totals(value.activities).some((n,f)=>cents(n)!==cents(value.amounts[f])))fail('ยอดกิจกรรมรวมไม่ตรงกับหัวโครงการ '+p.id);
   if(!value.owner||/ครูใหม่|รอระบุ/.test(value.owner))warnings.push('โครงการ '+p.id+' ผู้รับผิดชอบตามไฟล์: '+(value.owner||'ยังไม่ระบุ'));
   if(input.year===2570&&p.id===14){const total=value.amounts.reduce((s,n)=>s+cents(n),0);value.amounts=[money(total),0,0,0];value.aggregation={rule:'project14-single-subsidy',sourceGroups:value.activities.map(a=>({name:a.name,amounts:a.amounts,sourceRow:a.sourceRow}))};value.activities=[];warnings.push('โครงการ 14 รวมเป็นเงินอุดหนุน '+money(total).toLocaleString('th-TH',{minimumFractionDigits:2})+' บาท ไม่แยกกลุ่มสาระ');}
   activities+=value.activities.length;return value;
  }).sort((a,b)=>a.id-b.id);
  if(activities>2000)fail('กิจกรรมเกิน 2,000 รายการ');
  const sum=totals(projects);
  if(input.controls){
   if(input.controls.projectCount!==projects.length||amounts(input.controls.totals).some((n,f)=>cents(n)!==cents(sum[f])))fail('ยอดรวม/จำนวนโครงการไม่ตรงกับชีตสรุป');
   for(const d of input.controls.departments||[]){if(!departments.includes(d.name))fail('ฝ่ายในชีตสรุปไม่ถูกต้อง');const ps=projects.filter(p=>p.department===d.name);if(d.projects!==ps.length||amounts(d.totals).some((n,f)=>cents(n)!==cents(totals(ps)[f])))fail('ยอดหรือจำนวนโครงการไม่ตรงกับชีตสรุป: '+d.name);}
  }else fail('ต้องมีข้อมูลตรวจเทียบจากชีตสรุปยอดรวม');
  return {schema:1,kind:'allocation',year:input.year,source,projects,controls:input.controls,report:{projects:projects.length,activities,totals:sum,total:money(sum.reduce((s,n)=>s+cents(n),0)),warnings}};
 }
 const api={funds,departments,clean,cents,money,totals,normalize};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.BudgetAllocationModel=api;
})(typeof window==='undefined'?globalThis:window);
