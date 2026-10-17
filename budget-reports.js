(() => {
 const $=id=>document.getElementById(id),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const params=new URL(location.href).searchParams;let data,states={},sheets=[],busy=false;
 const sum=BudgetReports.sum;
 const headers=['ฝ่าย','โครงการ','กิจกรรม','งบตั้งต้น (นำเข้า)','รับจัดสรรตามทะเบียน','รับยืมงบ','ให้ยืมงบ','ใช้ไปตามทะเบียน','คงเหลือตามทะเบียน'];
 function options(id,items,placeholder){$(id).replaceChildren(new Option(placeholder,''),...items.map(([value,text])=>new Option(text,value)));}
 function invalidate(){sheets=[];$('report').hidden=true;$('pdf').disabled=$('excel').disabled=true;}
 function projects(){return data.projects.filter(p=>!$('department').value||p.department===$('department').value);}
 function activities(){const p=data.projects.find(p=>String(p.id)===$('project').value);options('activity',(p?.activities||[]).map(a=>[a.name,a.name]),'ทุกกิจกรรม');$('activity').disabled=!p;invalidate();}
 function departments(){options('project',projects().map(p=>[p.id,p.name]),'ทุกโครงการ');activities();}
 function table(title,head,rows){return `<h3>${esc(title)}</h3><div class="table-wrap"><table class="report-table"><thead><tr>${head.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.length?rows.map(row=>`<tr>${row.map(v=>`<td>${esc(v==null?'ไม่ระบุ':typeof v==='number'?v.toLocaleString('th-TH',{maximumFractionDigits:2,minimumFractionDigits:2}):v)}</td>`).join('')}</tr>`).join(''):`<tr><td colspan="${head.length}">ไม่มีรายการในขอบเขตนี้</td></tr>`}</tbody></table></div>`;}
 async function load(){
  if(busy)return;busy=true;invalidate();$('load').disabled=true;for(const id of ['department','project','activity'])$(id).disabled=true;
  try{
   const selected=projects().filter(p=>!$('project').value||String(p.id)===$('project').value);states={};
   if(!window.budgetIsAllocationPlan){let next=0,done=0;const results=await Promise.allSettled(Array.from({length:Math.min(3,selected.length)},async()=>{while(next<selected.length){const p=selected[next++];const state=await window.schoolRpc('getBudgetRegister',p.id,data.year);if(state.year!==data.year||state.projectId!==p.id)throw Error('ทะเบียนไม่ตรงกับปีหรือโครงการ');states[p.id]=state;$('status').textContent=`อ่านทะเบียน ${++done} / ${selected.length} โครงการ`;}}));const failed=results.find(r=>r.status==='rejected');if(failed)throw failed.reason;}
   const filter={department:$('department').value,project:$('project').value,activity:$('activity').value};
   const model=BudgetReports.build(data,states,filter);
   const deptRows=[...new Set(model.summaries.map(r=>r[0]))].map(name=>{const rs=model.summaries.filter(r=>r[0]===name);return [name,...headers.slice(3).map((_,i)=>sum(rs.map(r=>r[i+3])))];});
   const activityRows=[];for(const p of selected)for(const a of p.activities){if(filter.activity&&a.name!==filter.activity)continue;const m=BudgetReports.build(data,states,{project:String(p.id),activity:a.name});activityRows.push(...m.summaries);}
   sheets=[['สรุปรายฝ่าย',['ฝ่าย',...headers.slice(3)],deptRows],['สรุปโครงการ',headers,model.summaries],['สรุปกิจกรรม',headers,activityRows],['รายละเอียดรายการ',['ฝ่าย','โครงการ','กิจกรรม','ประเภทเงิน','แถวหัวทะเบียน','แถวรายการ','เลขที่','วันที่ตาม Sheet','รายการ','ใช้ไป','คงเหลือ','หมายเหตุ'],model.details],['ทะเบียนยืมงบ',['เลขที่','วันที่','โครงการต้นทาง','กิจกรรมต้นทาง','โครงการปลายทาง','กิจกรรมปลายทาง','ประเภทเงิน','จำนวนเงิน','เหตุผล','สถานะ'],model.loans]];
   const reportHeading=`สรุปงบประมาณ ${(filter.department||'ทุกฝ่าย').replace('ฝ่ายบริหารงานทั่วไป','ฝ่ายบริหารทั่วไป')} โรงเรียนค่ายบางระจันวิทยาคม ปีงบประมาณ ${data.year}`;
   $('reportTitle').textContent=reportHeading;document.title=reportHeading;$('reportFooter').textContent=reportHeading;
   let printStyle=document.getElementById('reportPrintStyle');if(!printStyle){printStyle=document.createElement('style');printStyle.id='reportPrintStyle';document.head.append(printStyle);}printStyle.textContent='@page{@bottom-center{content:'+JSON.stringify(reportHeading)+';font:9pt ReportThai,sans-serif;color:#333;}}';
   $('tables').innerHTML=sheets.map(s=>table(...s)).join('');$('report').hidden=false;
   $('status').textContent='รายงานพร้อมใช้งาน · ช่องไม่ระบุหมายถึงไม่มีข้อมูลครบพอสำหรับคำนวณ';$('pdf').disabled=false;$('excel').disabled=false;

  }catch(e){invalidate();$('status').textContent='สร้างรายงานไม่สำเร็จ: '+e.message+' · กรุณาลองใหม่';}
  finally{busy=false;$('load').disabled=false;$('department').disabled=$('project').disabled=false;$('activity').disabled=!$('project').value;}
 }
 $('department').addEventListener('change',departments);$('project').addEventListener('change',activities);$('activity').addEventListener('change',invalidate);$('load').addEventListener('click',load);
 $('pdf').addEventListener('click',async()=>{await document.fonts.ready;window.print();});
 let excelReady;function loadExcel(){if(window.XLSX)return Promise.resolve();return excelReady||(excelReady=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='vendor/xlsx.full.min.js';script.onload=()=>window.XLSX?resolve():reject(Error('โหลดตัวส่งออก Excel ไม่สำเร็จ'));script.onerror=()=>{script.remove();reject(Error('โหลดตัวส่งออก Excel ไม่สำเร็จ กรุณาลองใหม่'));};document.head.append(script);}).catch(e=>{excelReady=null;throw e}));}
 $('excel').addEventListener('click',async()=>{try{$('excel').disabled=true;await loadExcel();const book=XLSX.utils.book_new();const meta=[[$('reportTitle').textContent]];for(const [name,head,rows] of sheets){const sheet=XLSX.utils.aoa_to_sheet([...meta,[],head,...rows.map(r=>r.map(v=>v??'ไม่ระบุ'))]);sheet['!cols']=head.map((_,i)=>({wch:i<3?32:22}));sheet['!autofilter']={ref:XLSX.utils.encode_range({r:2,c:0},{r:2+rows.length,c:head.length-1})};XLSX.utils.book_append_sheet(book,sheet,name);}XLSX.writeFile(book,`รายงานงบประมาณ-${data.year}-${new Date().toISOString().slice(0,10)}.xlsx`);}catch(e){$('status').textContent='ส่งออก Excel ไม่สำเร็จ: '+e.message;}finally{$('excel').disabled=!sheets.length;}});
 (async()=>{try{const results=await Promise.all([window.schoolAuthReady,window.loadBudgetData({baseOnly:true})]);data=results[1];options('department',data.departments.map(d=>[d.name,d.name]),'ทุกฝ่าย');const p=data.projects.find(p=>String(p.id)===params.get('project'));if(p)$('department').value=p.department;departments();if(p){$('project').value=String(p.id);activities();if([...$('activity').options].some(o=>o.value===params.get('activity')))$('activity').value=params.get('activity');}$('load').disabled=false;$('status').textContent='เลือกขอบเขต แล้วกดดูรายงานเพื่ออ่านทะเบียนล่าสุด';}catch(e){$('status').textContent='โหลดข้อมูลไม่สำเร็จ: '+e.message;}})();
})();
