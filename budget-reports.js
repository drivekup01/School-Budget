(() => {
 const $=id=>document.getElementById(id),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const params=new URL(location.href).searchParams;let data,states={},sheets=[],detailTargets=[],busy=false;
 const sum=BudgetReports.sum;
 const headers=['ฝ่าย','โครงการ','กิจกรรม','ประเภทเงิน','งบตั้งต้น (นำเข้า)','รับจัดสรรตามทะเบียน','รับยืมงบ','ให้ยืมงบ','ใช้ไปตามทะเบียน','คงเหลือตามทะเบียน'];
 function options(id,items,placeholder){$(id).replaceChildren(new Option(placeholder,''),...items.map(([value,text])=>new Option(text,value)));}
 function invalidate(){sheets=[];$('report').hidden=true;$('pdf').disabled=$('excel').disabled=true;}
 function projects(){return data.projects.filter(p=>!$('department').value||p.department===$('department').value);}
 function activities(){const p=data.projects.find(p=>String(p.id)===$('project').value);options('activity',(p?.activities||[]).map(a=>[a.name,a.name]),'ทุกกิจกรรม');$('activity').disabled=!p;invalidate();}
 function departments(){options('project',projects().map(p=>[p.id,p.name]),'ทุกโครงการ');activities();}
 function visibleSheets(){const mode=$('reportKind').value;return sheets.filter((_,i)=>mode==='projects'?i<3:mode==='details'?i===3:i===4);}
 let reportSizeObserver;
 function paintReport(){
  reportSizeObserver?.disconnect();
  $('tables').innerHTML=visibleSheets().map(s=>renderReportTable(...s)).join('');
  const scroller=$('tables').querySelector('.report-detail-scroll');if(!scroller)return;
  const detailTable=scroller.querySelector('table');
  const fit=()=>{const rows=[...detailTable.querySelectorAll('tbody>tr')];const height=detailTable.querySelector('thead').getBoundingClientRect().height+rows.slice(0,20).reduce((n,row)=>n+row.getBoundingClientRect().height,0)+4;
   scroller.style.setProperty('height','auto','important');
   scroller.style.setProperty('max-height',rows.length<=20?'none':height+'px','important');
  };
  fit();reportSizeObserver=new ResizeObserver(fit);reportSizeObserver.observe(detailTable);
 }

 function editCell(target){if(!target?.editable||!window.schoolUser?.canWriteBudget||data.year===2569)return '<td class="report-edit">—</td>';const query=new URLSearchParams({year:String(data.year),project:String(target.projectId),header:String(target.headerRow),editRow:String(target.row)});return `<td class="report-edit"><a class="report-link" target="_top" href="budget-entry.html?${esc(query.toString())}">แก้ไข</a></td>`;}
 function compactDetails(rows){const money=v=>esc(v==null?'ไม่ระบุ':Number(v).toLocaleString('th-TH',{minimumFractionDigits:2,maximumFractionDigits:2}));return `<div class="report-detail-screen"><p class="report-detail-count">${rows.length} รายการ · ใช้ไปตามรายการ ${money(sum(rows.map(r=>r[8])))} บาท</p><div class="table-wrap report-detail-scroll"><table class="report-table report-detail-compact"><colgroup><col style="width:12%"><col style="width:27%"><col style="width:16%"><col style="width:23%"><col style="width:13%"><col style="width:9%"></colgroup><thead><tr><th>วันที่ / เลขเอกสาร</th><th>โครงการ / กิจกรรม</th><th>ประเภทเงิน</th><th>รายการ</th><th>ใช้ไป (บาท)</th><th class="report-edit">จัดการ</th></tr></thead><tbody>${rows.length?rows.map((r,i)=>`<tr><td><span class="report-date">${esc(r[1])}</span><strong>${esc(r[0])}</strong></td><td><div class="report-clamp" title="${esc(r[3])}">${esc(r[3])}</div><small class="report-clamp" title="${esc(r[4])}">${esc(r[4])}</small></td><td>${esc(r[5])}</td><td><div class="report-clamp">${esc(r[6])}</div><details class="report-row-details"><summary>รายละเอียด</summary><div><strong>ฝ่าย:</strong> ${esc(r[2])}<br><strong>โครงการ:</strong> ${esc(r[3])}<br><strong>กิจกรรม:</strong> ${esc(r[4])}<br><strong>รายการ:</strong> ${esc(r[6])}<br><strong>รับเพิ่ม:</strong> ${money(r[7])} บาท<br><strong>คงเหลือ:</strong> ${money(r[9])} บาท<br><strong>หมายเหตุ:</strong> ${esc(r[10]||'—')}</div></details></td><td class="report-amount">${money(r[8])}</td>${editCell(detailTargets[i])}</tr>`).join(''):'<tr><td colspan="6">ไม่มีรายการในขอบเขตนี้</td></tr>'}</tbody></table></div></div>`;}
 function renderReportTable(title,head,rows){const editing=title==='รายละเอียดรายการ';return `<h3>${esc(title)}</h3>${editing?compactDetails(rows):''}<div class="table-wrap ${editing?'report-detail-print':''}"><table class="report-table"><thead><tr>${head.map(h=>`<th>${esc(h)}</th>`).join('')}${editing?'<th class="report-edit">จัดการ</th>':''}</tr></thead><tbody>${rows.length?rows.map((row,index)=>`<tr>${row.map(v=>`<td>${esc(v==null?'ไม่ระบุ':typeof v==='number'?v.toLocaleString('th-TH',{maximumFractionDigits:2,minimumFractionDigits:2}):v)}</td>`).join('')}${editing?editCell(detailTargets[index]):''}</tr>`).join(''):`<tr><td colspan="${head.length}">ไม่มีรายการในขอบเขตนี้</td></tr>`}</tbody></table></div>`;}
 async function load(){
  if(busy)return;busy=true;invalidate();$('load').disabled=true;for(const id of ['department','project','activity','fund'])$(id).disabled=true;
  try{
   await window.schoolAuthReady;const selected=projects().filter(p=>!$('project').value||String(p.id)===$('project').value);states={};$('reportTitle').textContent='กำลังอ่านทะเบียนล่าสุด '+selected.length+' โครงการ';$('tables').textContent='กำลังรวบรวมข้อมูล · สามารถดูความคืบหน้าด้านบนได้';$('report').hidden=false;
   if(!window.budgetIsAllocationPlan){let next=0,done=0;const results=await Promise.allSettled(Array.from({length:Math.min(3,selected.length)},async()=>{while(next<selected.length){const p=selected[next++];const state=await window.schoolRpc('getBudgetRegister',p.id,data.year);if(state.year!==data.year||state.projectId!==p.id)throw Error('ทะเบียนไม่ตรงกับปีหรือโครงการ');states[p.id]=state;$('status').textContent=`อ่านทะเบียน ${++done} / ${selected.length} โครงการ`;}}));const failed=results.find(r=>r.status==='rejected');if(failed)throw failed.reason;}
   const filter={department:$('department').value,project:$('project').value,activity:$('activity').value,budgetType:$('fund').value===''?'':$('fund').selectedOptions[0].textContent};
   const model=BudgetReports.build(data,states,{...filter,splitFunds:true});
   detailTargets=model.detailTargets;
   const summaryRows=rows=>rows.map(r=>[...r.slice(0,3),r[9],...r.slice(3,9)]);
   const deptRows=[...new Set(model.summaries.map(r=>JSON.stringify([r[0],r[9]])))].map(key=>{const [name,fund]=JSON.parse(key),rs=model.summaries.filter(r=>r[0]===name&&r[9]===fund);return [name,fund,...headers.slice(4).map((_,i)=>sum(rs.map(r=>r[i+3])))];});
   const activityRows=[];for(const p of selected)for(const a of p.activities){if(filter.activity&&a.name!==filter.activity)continue;const m=BudgetReports.build(data,states,{project:String(p.id),activity:a.name,budgetType:filter.budgetType,splitFunds:true});activityRows.push(...m.summaries);}
   sheets=[['สรุปรายฝ่าย',['ฝ่าย','ประเภทเงิน',...headers.slice(4)],deptRows],['สรุปโครงการ',headers,summaryRows(model.summaries)],['สรุปกิจกรรม',headers,summaryRows(activityRows)],['รายละเอียดรายการ',['เลขที่','วันที่','ฝ่าย','โครงการ','กิจกรรม','ประเภทเงิน','รายการ','รับเพิ่ม','ใช้ไป','คงเหลือ','หมายเหตุ'],model.details],['ทะเบียนยืมงบ',['เลขที่','วันที่','โครงการต้นทาง','กิจกรรมต้นทาง','โครงการปลายทาง','กิจกรรมปลายทาง','ประเภทเงิน','จำนวนเงิน','เหตุผล','สถานะ'],model.loans]];
   const reportHeading=`สรุปงบประมาณ ${filter.budgetType||'ทุกประเภทเงิน'} · ${(filter.department||'ทุกฝ่าย').replace('ฝ่ายบริหารงานทั่วไป','ฝ่ายบริหารทั่วไป')} โรงเรียนค่ายบางระจันวิทยาคม ปีงบประมาณ ${data.year}`;
   $('reportTitle').textContent=reportHeading;document.title=reportHeading;$('reportFooter').textContent=reportHeading;
   let printStyle=document.getElementById('reportPrintStyle');if(!printStyle){printStyle=document.createElement('style');printStyle.id='reportPrintStyle';document.head.append(printStyle);}printStyle.textContent='@page{@bottom-center{content:'+JSON.stringify(reportHeading)+';font:9pt ReportThai,sans-serif;color:#333;}}';
   paintReport();$('report').hidden=false;
   $('status').textContent='รายงานพร้อมใช้งาน · ช่องไม่ระบุหมายถึงไม่มีข้อมูลครบพอสำหรับคำนวณ';$('pdf').disabled=false;$('excel').disabled=false;

  }catch(e){invalidate();$('status').textContent='สร้างรายงานไม่สำเร็จ: '+e.message+' · กรุณาลองใหม่';}
  finally{busy=false;$('load').disabled=false;$('department').disabled=$('project').disabled=$('fund').disabled=false;$('activity').disabled=!$('project').value;}
 }
 $('department').addEventListener('change',departments);$('project').addEventListener('change',activities);$('activity').addEventListener('change',invalidate);$('fund').addEventListener('change',invalidate);$('load').addEventListener('click',load);
 $('reportKind').addEventListener('change',()=>{if(sheets.length)paintReport();});
 $('pdf').addEventListener('click',async()=>{await document.fonts.ready;window.print();});
 let excelReady;function loadExcel(){if(window.XLSX)return Promise.resolve();return excelReady||(excelReady=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='vendor/xlsx.full.min.js';script.onload=()=>window.XLSX?resolve():reject(Error('โหลดตัวส่งออก Excel ไม่สำเร็จ'));script.onerror=()=>{script.remove();reject(Error('โหลดตัวส่งออก Excel ไม่สำเร็จ กรุณาลองใหม่'));};document.head.append(script);}).catch(e=>{excelReady=null;throw e}));}
 $('excel').addEventListener('click',async()=>{try{$('excel').disabled=true;await loadExcel();const book=XLSX.utils.book_new();const meta=[[$('reportTitle').textContent]];for(const [name,head,rows] of visibleSheets()){const sheet=XLSX.utils.aoa_to_sheet([...meta,[],head,...rows.map(r=>r.map(v=>v??'ไม่ระบุ'))]);sheet['!cols']=head.map((_,i)=>({wch:i<3?32:22}));sheet['!autofilter']={ref:XLSX.utils.encode_range({r:2,c:0},{r:2+rows.length,c:head.length-1})};XLSX.utils.book_append_sheet(book,sheet,name);}XLSX.writeFile(book,`รายงานงบประมาณ-${data.year}-${new Date().toISOString().slice(0,10)}.xlsx`);}catch(e){$('status').textContent='ส่งออก Excel ไม่สำเร็จ: '+e.message;}finally{$('excel').disabled=!sheets.length;}});
 (async()=>{try{data=await window.loadBudgetData({baseOnly:true});options('department',data.departments.map(d=>[d.name,d.name]),'ทุกฝ่าย');const p=data.projects.find(p=>String(p.id)===params.get('project'));if(data.departments.some(d=>d.name===params.get('department')))$('department').value=params.get('department');if(p)$('department').value=p.department;if(['0','1','2','3'].includes(params.get('fund')))$('fund').value=params.get('fund');departments();if(p){$('project').value=String(p.id);activities();if([...$('activity').options].some(o=>o.value===params.get('activity')))$('activity').value=params.get('activity');}$('load').disabled=false;$('status').textContent='เลือกขอบเขต แล้วกดดูรายงานเพื่ออ่านทะเบียนล่าสุด';if(params.get('autoload')==='1')await load();}catch(e){$('status').textContent='โหลดข้อมูลไม่สำเร็จ: '+e.message;}})();
})();
