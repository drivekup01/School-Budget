/* Excel adapter: explicit headers only; never infer positional financial fields. */
(function(root){
 const unitHeaders=['ปีงบประมาณ','รหัสโครงการ','ฝ่ายงาน','โครงการ','ผู้รับผิดชอบ','กิจกรรม','ประเภทเงิน','จัดสรร','รายรับ','คงเหลือ'];
 const entryHeaders=['ปีงบประมาณ','รหัสโครงการ','กิจกรรม','ประเภทเงิน','วันที่','เลขเอกสาร','รายการ','ใช้เงิน','คงเหลือ','หมายเหตุ'];
 function parse(files,year,XLSX,options={}){
  const payload={schema:1,year:Number(year),files:files.map(f=>f.name),units:[],sourceWarnings:[],sourceAudit:[],plans:[],borrowing:[]},issues=[],pending=[],mappings=[];
  const add=(level,location,message)=>issues.push({level,location,message});
  const normalize=v=>String(v??'').trim(),key=(id,fund,activity)=>id+'|'+fund+'|'+activity;
  function number(value,location,optional=false){if((value==null||value==='')&&optional)return null;const n=typeof value==='number'?value:typeof value==='string'&&/^-?\d+(?:,\d{3})*(?:\.\d{1,2})?$/.test(value.trim())?Number(value.replace(/,/g,'')):NaN;if(!Number.isFinite(n))add('error',location,'จำนวนเงินหายไปหรือไม่ใช่ตัวเลข');return n;}
  function date(value,location){if(typeof value==='number'){const d=XLSX.SSF.parse_date_code(value);if(d)return d.y+'-'+String(d.m).padStart(2,'0')+'-'+String(d.d).padStart(2,'0');}return normalize(value);}
  for(const file of files){let recognized=0;
   if(file.encoding&&file.encoding!=='UTF-8')payload.sourceWarnings.push({location:file.name,message:'อ่าน CSV ด้วย '+file.encoding+' โปรดตรวจอักษรภาษาไทย'});
   const adapted=(file.kind==='csv'?root.BudgetCSV?.parseFile(file,year,XLSX):null)||root.BudgetLegacyImport?.parseFile(file,year,XLSX,options);
   if(adapted){payload.units.push(...adapted.units);payload.plans.push(...adapted.plans);payload.sourceWarnings.push(...adapted.warnings);payload.sourceAudit.push(...adapted.audit);issues.push(...adapted.issues);mappings.push(...adapted.mappings);
    for(const name of file.book.SheetNames)for(const [address,cell] of Object.entries(file.book.Sheets[name])){if(address[0]==='!')continue;const loc=file.name+'/'+name+'!'+address;if(cell.t==='e'||cell.f?.includes('#REF!'))add('error',loc,'สูตรหรือเซลล์มีข้อผิดพลาด');if(cell.f&&cell.v==null)add('error',loc,'สูตรไม่มีผลคำนวณ กรุณาคำนวณและบันทึก Excel ก่อน');if(cell.f)for(const ref of cell.f.matchAll(/'((?:[^']|'')+)'!/g)){const title=ref[1].replace(/''/g,"'");if(!file.book.Sheets[title])add('error',loc,'สูตรอ้างถึงชีตที่ไม่มีอยู่: '+title);}}
    continue;
   }
   for(const name of file.book.SheetNames){
    const ws=file.book.Sheets[name];if(!ws['!ref'])continue;const range=XLSX.utils.decode_range(ws['!ref']);if(range.e.r>50000||range.e.c>127){add('error',file.name+'/'+name,'ชีตมีขนาดเกิน 50,000 แถวหรือ 128 คอลัมน์');continue;}
    for(const address of Object.keys(ws).filter(k=>k[0]!=='!')){const cell=ws[address],loc=file.name+'/'+name+'!'+address;
     if(cell.t==='e'||typeof cell.v==='string'&&/^#(REF!|VALUE!|DIV\/0!|N\/A|NAME\?|NUM!|SPILL!)/.test(cell.v))add('error',loc,'เซลล์มีข้อผิดพลาด '+String(cell.v));
     if(cell.f){if(/#REF!/.test(cell.f))add('error',loc,'สูตรอ้างอิงเซลล์ที่ไม่มีอยู่');if(cell.v==null)add('error',loc,'สูตรไม่มีผลคำนวณ กรุณาคำนวณและบันทึกใน Excel ก่อน');}
    }
    const rows=XLSX.utils.sheet_to_json(ws,{header:1,defval:'',blankrows:true,raw:true});let found=null;
    for(let r=0;r<Math.min(30,rows.length);r++){const headers=rows[r].map(normalize);for(const type of ['unit','entry']){const needed=type==='unit'?unitHeaders:entryHeaders;if(needed.every(h=>headers.includes(h))){found={type,r,headers,needed};break;}}if(found)break;}
    if(!found){add('error',file.name+'/'+name,'ไม่พบหัวตารางที่รองรับ กรุณาใช้แม่แบบหรือปรับชื่อคอลัมน์ให้ตรง (ไม่ข้ามชีตนี้อัตโนมัติ)');continue;}recognized++;
    const col=h=>found.headers.indexOf(h),loc=(r,h)=>file.name+'/'+name+'!'+XLSX.utils.encode_cell({r,c:col(h)});
    for(let r=found.r+1;r<rows.length;r++){const row=rows[r];if(!row.some(v=>v!==''&&v!=null))continue;const get=h=>row[col(h)];if(Number(get('ปีงบประมาณ'))!==Number(year)){add('error',loc(r,'ปีงบประมาณ'),'ปีในไฟล์ไม่ตรงกับปีที่เลือก');continue;}
     const base={projectId:Number(get('รหัสโครงการ')),activity:normalize(get('กิจกรรม')),fund:normalize(get('ประเภทเงิน')),location:file.name+'/'+name+'!'+(r+1)};
     if(found.type==='unit')payload.units.push(Object.assign(base,{department:normalize(get('ฝ่ายงาน')),projectName:normalize(get('โครงการ')),owner:normalize(get('ผู้รับผิดชอบ')),allocated:number(get('จัดสรร'),loc(r,'จัดสรร')),received:number(get('รายรับ'),loc(r,'รายรับ')),declaredRemaining:number(get('คงเหลือ'),loc(r,'คงเหลือ')),entries:[]}));
     else pending.push(Object.assign(base,{date:date(get('วันที่'),loc(r,'วันที่')),number:normalize(get('เลขเอกสาร')),description:normalize(get('รายการ')),spent:number(get('ใช้เงิน'),loc(r,'ใช้เงิน')),declaredRemaining:number(get('คงเหลือ'),loc(r,'คงเหลือ'),true),note:normalize(get('หมายเหตุ'))}));
    }
   }if(!recognized)add('error',file.name,'ไม่พบข้อมูลที่นำเข้าได้');
  }
  const index=new Map(payload.units.map(u=>[key(u.projectId,u.fund,u.activity),u]));for(const e of pending){const unit=index.get(key(e.projectId,e.fund,e.activity));if(!unit)add('error',e.location,'ไม่พบทะเบียนของโครงการ/กิจกรรม/ประเภทเงินนี้');else unit.entries.push(e);}
  if(files.some(f=>f.kind!=='csv'))payload.sourceWarnings.push({location:'สูตร Excel',message:'ระบบตรวจข้อผิดพลาดและความสัมพันธ์ของยอดเงิน แต่ไม่ได้คำนวณสูตร Excel ทุกชนิดใหม่ กรุณาบันทึกผลคำนวณล่าสุดก่อนอัปโหลด'});
  const report=root.BudgetImportModel.check(payload,year);report.issues.unshift(...issues);report.valid=!report.issues.some(i=>i.level==='error');return {payload,report,mappings};
 }
 const api={unitHeaders,entryHeaders,parse};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.BudgetExcelImport=api;
})(typeof window==='undefined'?globalThis:window);
