/* Preview only: no uploaded workbook is transmitted or persisted. */
(async()=>{
 const byId=id=>document.getElementById(id), access=byId('accessStatus');
 let user;try{user=await window.schoolAuthReady;}catch{access.textContent='กรุณาเข้าสู่ระบบใหม่';return;}
 if(user.id!=='teanpak.su'||user.role!=='admin'){access.textContent='หน้านี้เปิดให้เฉพาะบัญชี teanpak.su ที่มีสิทธิ์ผู้ดูแลระบบ';return;}
 access.textContent='ผู้ดูแลข้อมูล: teanpak.su';byId('importContent').hidden=false;
 const fileInput=byId('importFile'),sheet=byId('importSheet'),status=byId('fileStatus'),panel=byId('previewPanel');let workbook=null,generation=0;
 function preview(){
  const ws=workbook?.Sheets[sheet.value];if(!ws)return;
  const range=XLSX.utils.decode_range(ws['!ref']||'A1');
  const sample={s:range.s,e:{r:Math.min(range.e.r,range.s.r+24),c:Math.min(range.e.c,range.s.c+23)}};
  const rows=XLSX.utils.sheet_to_json(ws,{header:1,range:sample,defval:'',raw:false,blankrows:true});
  const table=byId('importPreview');table.replaceChildren();
  for(let i=0;i<rows.length;i++){const tr=document.createElement('tr'),th=document.createElement('th');th.scope='row';th.textContent=String(range.s.r+i+1);tr.append(th);for(const value of rows[i]){const td=document.createElement('td');td.textContent=String(value);tr.append(td);}table.append(tr);}
  byId('sheetStatus').textContent='ตัวอย่างสูงสุด 25 แถว × 24 คอลัมน์ • ยังไม่ใช่ผลการนำเข้า';
 }
 sheet.addEventListener('change',preview);
 fileInput.addEventListener('change',async()=>{
  const request=++generation;workbook=null;panel.hidden=true;sheet.replaceChildren();byId('importPreview').replaceChildren();status.textContent='';const file=fileInput.files[0];if(!file)return;
  if(!/\.(xlsx|xls)$/i.test(file.name)){status.textContent='กรุณาเลือกไฟล์ .xlsx หรือ .xls';return;}
  if(file.size>10*1024*1024){status.textContent='ไฟล์มีขนาดเกิน 10 MB';return;}
  if(!window.XLSX){status.textContent='โหลดตัวอ่าน Excel ไม่สำเร็จ กรุณาโหลดหน้าใหม่';return;}
  status.textContent='กำลังอ่านไฟล์…';
  try{const bytes=await file.arrayBuffer();if(request!==generation)return;const parsed=XLSX.read(bytes,{type:'array',sheetRows:25});if(!parsed.SheetNames.length)throw Error('ไม่พบชีต');workbook=parsed;for(const name of workbook.SheetNames){const option=document.createElement('option');option.value=name;option.textContent=name;sheet.append(option);}status.textContent=file.name+' • '+workbook.SheetNames.length+' ชีต • อ่านตัวอย่างสำเร็จ';panel.hidden=false;preview();}
  catch{if(request===generation){workbook=null;status.textContent='อ่านไฟล์ไม่ได้ กรุณาตรวจว่าเป็นไฟล์ Excel ที่ไม่เสียหายและไม่มีรหัสผ่าน';}}
 });
})();
