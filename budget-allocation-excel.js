(function(root){
 'use strict';
 const A=typeof module!=='undefined'&&module.exports?require('./functions/allocation-model'):root.BudgetAllocationModel;
 function parse(X,book,source,year){
  const fail=m=>{throw Error(m)},clean=A.clean,notes=[];
  if(book.SheetNames.length>30)fail('จำนวนชีตเกินกำหนด');
  for(const name of book.SheetNames)for(const [address,c] of Object.entries(book.Sheets[name]))if(!address.startsWith('!')&&(c.t==='e'||c.f&&(c.v===undefined||c.v===null)))fail('สูตรไม่มีผลลัพธ์หรือมีข้อผิดพลาด: '+name+'!'+address);
  function rows(sheet){const range=X.utils.decode_range(sheet['!ref']||'A1');if(range.e.r>10000||range.e.c>100)fail('ตารางมีขนาดเกินกำหนด');return X.utils.sheet_to_json(sheet,{header:1,defval:null,raw:true});}
  const sheets=book.SheetNames.map(name=>({name,rows:rows(book.Sheets[name])}));
  const found=sheets.filter(s=>s.rows.slice(0,12).some(r=>r.some(v=>clean(v)==='โครงการ/กิจกรรม')));if(found.length!==1)fail('ต้องมีชีตโครงการ/กิจกรรมที่ระบุได้เพียงชีตเดียว');
  const main=found[0],hr=main.rows.findIndex(r=>r.some(v=>clean(v)==='โครงการ/กิจกรรม')),heads=main.rows[hr],nameCol=heads.findIndex(v=>clean(v)==='โครงการ/กิจกรรม'),idCol=heads.findIndex(v=>clean(v)==='ที่'),ownerCol=heads.findIndex(v=>clean(v)==='ผู้รับผิดชอบ');
  if(idCol<0||ownerCol<0)fail('ไม่พบหัวตาราง ที่ / ผู้รับผิดชอบ');
  function fundColumns(rs,start){const matches=[[],[],[],[]];for(let r=start;r<Math.min(start+4,rs.length);r++)rs[r].forEach((v,c)=>{const t=clean(v);const f=/เงินอุดหนุน/.test(t)?0:/พัฒนาผู้เรียน/.test(t)?1:/เงินรายได้/.test(t)?2:/^อื่น\s*ๆ?$/.test(t)?3:-1;if(f>=0)matches[f].push({r,c});});if(matches.some(m=>m.length!==1))fail('หัวตารางประเภทเงินต้องครบ 4 ประเภทและไม่ซ้ำ');return matches.map(m=>m[0]);}
  const cols=fundColumns(main.rows,hr),lastHead=Math.max(...cols.map(v=>v.r));
  const header=main.rows.slice(0,hr).flat().map(clean).join(' '),years=[...header.matchAll(/25\d{2}/g)].map(m=>Number(m[0]));if(!years.includes(year)||new Set(years).size!==1)fail('ปีในหัวตารางไม่ตรงกับปีงบประมาณที่เลือก');
  function amounts(row,cs,label){return cs.map(({c})=>{const v=row[c];if(v===null||v===undefined||typeof v==='string'&&!v.trim())return 0;if(clean(v)==='เงินทุนการศึกษา'){notes.push(label+' คอลัมน์ '+X.utils.encode_col(c)+': '+clean(v)+' (ไม่มีจำนวนเงิน จึงไม่รวมยอด)');return 0;}if(typeof v!=='number'||!Number.isFinite(v)||v<0||Math.abs(v*100-Math.round(v*100))>.001)fail('จำนวนเงินไม่ถูกต้อง '+label+' คอลัมน์ '+X.utils.encode_col(c));return A.money(A.cents(v));});}
  let department='',current;const projects=[];
  for(let r=lastHead+1;r<main.rows.length;r++){const row=main.rows[r],id=row[idCol],name=clean(row[nameCol]),heading=clean(id);if(A.departments.includes(heading)){department=heading;current=null;continue;}if(typeof id==='number'&&Number.isInteger(id)&&/^โครงการ/.test(name)){if(!department)fail('ไม่พบฝ่ายงานก่อนโครงการแถว '+(r+1));current={id,name,owner:clean(row[ownerCol]),department,sourceRow:r+1,amounts:amounts(row,cols,'แถว '+(r+1)),activities:[]};projects.push(current);continue;}if(/^[-–•]/.test(name)){if(!current)fail('กิจกรรมไม่มีหัวโครงการ แถว '+(r+1));current.activities.push({name:clean(name.replace(/^[-–•]\s*/,'')),owner:clean(row[ownerCol]),sourceRow:r+1,amounts:amounts(row,cols,'แถว '+(r+1))});}else if(name&&/^โครงการ/.test(name))fail('รหัสโครงการไม่ถูกต้อง แถว '+(r+1));}
  const summary=sheets.find(s=>clean(s.name)==='สรุปยอดรวม');if(!summary)fail('ไม่พบชีตสรุปยอดรวมสำหรับตรวจเทียบ');
  const sh=summary.rows.findIndex(r=>r.some(v=>clean(v)==='จำนวนโครงการ')),sc=fundColumns(summary.rows,sh),countCol=summary.rows[sh].findIndex(v=>clean(v)==='จำนวนโครงการ'),deptCol=summary.rows[sh].findIndex(v=>clean(v)==='ฝ่าย');
  const controls={departments:[]};for(let r=sh+1;r<summary.rows.length;r++){const row=summary.rows[r],d=clean(row[deptCol]);if(d==='รวม'){controls.projectCount=row[countCol];controls.totals=amounts(row,sc,'สรุปแถว '+(r+1));}else{const full=A.departments.find(n=>n===d||n.replace('ฝ่ายบริหารงาน','')===d);if(full)controls.departments.push({name:full,projects:row[countCol],totals:amounts(row,sc,'สรุปแถว '+(r+1))});}}
  if(controls.departments.length!==4||new Set(controls.departments.map(d=>d.name)).size!==4)fail('สรุปต้องมีข้อมูลครบทั้ง 4 ฝ่าย');
  const input={schema:1,kind:'allocation',year,source:{...source,sheet:main.name,header:clean(header),notes},projects,controls};A.normalize(input);return input;
 }
 const api={parse};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.BudgetAllocationExcel=api;
})(typeof window==='undefined'?globalThis:window);
