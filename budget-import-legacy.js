/* Adapter for the supplied 2569 registers. Never infer a conflicting fund silently. */
(function(root){
 const clean=v=>String(v??'').replace(/\s+/g,' ').trim(),norm=v=>clean(v).replace(/\s/g,'');
 function parseFile(file,year,X,options={}){
  const M=root.BudgetImportModel,issues=[],warnings=[],audit=[],units=[],plans=[],mappings=[];
  const add=(level,location,message)=>issues.push({level,location,message}),warn=(location,message)=>warnings.push({location,message});
  const loc=(sheet,a)=>file.name+'/'+sheet+'!'+a;
  function grid(ws){const ref=X.utils.decode_range(ws['!ref']||'A1');if(ref.e.r>50000||ref.e.c>127)throw Error('ชีตเกิน 50,000 แถวหรือ 128 คอลัมน์');const rows=[];for(let r=0;r<=ref.e.r;r++){const row=[];for(let c=0;c<=ref.e.c;c++)row[c]=ws[X.utils.encode_cell({r,c})]?.v??'';rows.push(row);}return rows;}
  function amount(v,where,optional=true){if(v==null||clean(v)==='')return optional?null:0;const n=typeof v==='number'?v:/^-?\d[\d,]*(\.\d+)?$/.test(clean(v))?Number(clean(v).replace(/,/g,'')):NaN;if(!Number.isFinite(n)){warn(where,'ช่องจำนวนเงินมีข้อความ ไม่แปลงเป็นยอดเงิน: '+clean(v));return null;}if(Math.abs(n*100-M.cents(n))>.0001)warn(where,'จำนวนเงินมีทศนิยมเกิน 2 ตำแหน่ง ใช้ค่าปัดสตางค์ในตัวอย่าง');return M.money(M.cents(n));}
  function header(rows){const r=rows.findIndex(row=>row.some(v=>norm(v)==='โครงการ/กิจกรรม'));if(r<0)return null;const name=rows[r].findIndex(v=>norm(v)==='โครงการ/กิจกรรม'),owner=rows[r].findIndex(v=>norm(v)==='ผู้รับผิดชอบ'),fundCols=[];for(let c=0;c<rows[r].length;c++){const text=rows.slice(r+1,r+3).map(row=>norm(row[c])).join(' ');if(text.includes('อุดหนุนรายหัว'))fundCols[0]=c;else if(text.includes('พัฒนาผู้เรียน'))fundCols[1]=c;else if(text.includes('รายได้สถานศึกษา'))fundCols[2]=c;else if(text.includes('อื่น'))fundCols[3]=c;}return {r,name,id:name-1,owner,fundCols};}
  function amounts(row,h,sheet,r){return M.funds.map((_,f)=>h.fundCols[f]==null?null:amount(row[h.fundCols[f]],loc(sheet,X.utils.encode_cell({r,c:h.fundCols[f]}))));}
  const book=file.book;for(const name of book.SheetNames){const ws=book.Sheets[name];audit.push({kind:'source-sheet',location:file.name+'/'+name,cells:Object.fromEntries(Object.entries(ws).filter(([a,c])=>a[0]!=='!'&&(c.v!==''&&c.v!=null||c.f)).map(([a,c])=>[a,{v:c.v instanceof Date?c.v.toISOString():c.v,t:c.t,f:c.f}]))});}
  const planName=book.SheetNames.find(n=>['โครงการทั้งหมด','โครงการ'].includes(clean(n)));if(!planName)return null;
  const rows=grid(book.Sheets[planName]),h=header(rows);if(!h||h.fundCols.filter(c=>c!=null).length!==4)return null;
  const hinted=clean(file.name).match(/(?:25\d{2})/);if(hinted&&Number(hinted[0])!==Number(year))add('error',file.name,'ปีในชื่อไฟล์ '+hinted[0]+' ไม่ตรงกับปีที่เลือก '+year);
  let department='',current=null,lastActivity=null;
  rows.forEach((row,r)=>{const d=M.depts.find(d=>row.some(v=>norm(v)===norm(d)));if(d){department=d;current=null;lastActivity=null;return;}
   const id=Number(row[h.id]),name=clean(row[h.name]);if(Number.isInteger(id)&&id>0&&name.startsWith('โครงการ')){if(!department){add('error',loc(planName,r+1),'ไม่พบฝ่ายงานของโครงการ');return;}current={id,department,name,owner:clean(row[h.owner]),amounts:amounts(row,h,planName,r),activities:[],location:loc(planName,r+1)};plans.push(current);lastActivity=null;}
   else if(current&&/^[-–]/.test(name)){lastActivity={name:name.replace(/^[-–]\s*/,''),owner:clean(row[h.owner]),amounts:amounts(row,h,planName,r),location:loc(planName,r+1)};current.activities.push(lastActivity);}
   else if(current&&lastActivity&&name&&!/^รวม/.test(name)&&!row.slice(h.name+1,h.name+5).some(v=>typeof v==='number'))lastActivity.name+=' '+name;
   if(row.some(v=>/^รวม/.test(clean(v)))){const label=clean(row[h.id]);audit.push({location:loc(planName,r+1),kind:'plan-control',department,label,amounts:amounts(row,h,planName,r)});audit.push({location:loc(planName,r+1),kind:'summary',department,values:row.map(v=>v instanceof Date?v.toISOString():v)});current=null;lastActivity=null;}
  });
  const balanceName=book.SheetNames.find(n=>clean(n)==='ยอดคงเหลือ'),balance=balanceName?grid(book.Sheets[balanceName]):[],bh=balanceName?header(balance):null;
  const refs=[];if(bh){let pid=null,dept='';balance.forEach((row,r)=>{const d=M.depts.find(d=>row.some(v=>norm(v)===norm(d)));if(d)dept=d;const candidate=Number(row[bh.id]);if(Number.isInteger(candidate)&&candidate>0&&clean(row[bh.name]).startsWith('โครงการ'))pid=candidate;
    for(let f=0;f<4;f++){const c=bh.fundCols[f],cell=book.Sheets[balanceName][X.utils.encode_cell({r,c})];if(cell?.f){const match=cell.f.match(/^=?'((?:[^']|'')+)'!\$?([A-Z]+)\$?(\d+)$/);if(match)refs.push({projectId:pid,fund:f,sheet:match[1].replace(/''/g,"'"),row:Number(match[3])-1,value:amount(cell.v,loc(balanceName,X.utils.encode_cell({r,c}))),location:loc(balanceName,X.utils.encode_cell({r,c}))});}}
    if(row.some(v=>/ยืมเงิน/.test(clean(v)))){warn(loc(balanceName,r+1),'มีรายการยืมในหน้าสรุปที่ไม่ระบุทะเบียนต้นทาง/ปลายทางครบ เก็บไว้ตรวจสอบ แต่ไม่สร้างการยืมซ้ำหรือหักจากทะเบียนเอง');audit.push({location:loc(balanceName,r+1),kind:'unmapped-borrowing',department:dept,values:row});}
    if(row.some(v=>/รวม|คงเหลืองบประมาณ/.test(clean(v)))){audit.push({kind:'balance-control',location:loc(balanceName,r+1),department:dept,amounts:amounts(row,bh,balanceName,r)});audit.push({location:loc(balanceName,r+1),kind:'balance-summary',department:dept,values:row});}
  });}
  const dateWarnings=new Map();
  function date(cell,where){if(!cell||clean(cell.v)==='')return '';let d;
   if(typeof cell.v==='number')d=X.SSF.parse_date_code(cell.v,{date1904:!!book.Workbook?.WBProps?.date1904});
   else if(cell.v instanceof Date||typeof cell.v==='string'&&/^\d{4}-\d{2}-\d{2}T/.test(cell.v)){const dt=new Date(cell.v),parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'numeric',day:'numeric'}).formatToParts(dt);const p=Object.fromEntries(parts.map(p=>[p.type,p.value]));d={y:Number(p.year),m:Number(p.month),d:Number(p.day)};}
   else {const text=clean(cell.v),iso=text.match(/^(\d{4})-(\d{2})-(\d{2})$/),short=text.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/);if(iso)d={y:Number(iso[1]),m:Number(iso[2]),d:Number(iso[3])};else if(short)d={d:Number(short[1]),m:Number(short[2]),y:Number(short[3])};else {add('error',where,'อ่านวันที่ไม่ได้: '+text);return text;}}
   if(!d){add('error',where,'อ่านวันที่ Excel ไม่ได้');return '';}
   const old=d.y;if(d.y>=2500&&d.y<=2700)d.y-=543;
   else if(d.y<100||d.y>=1900&&d.y<2000){if(!options.dateMode){add('error',where,'พบปี '+d.y+' กรุณาเลือกวิธีอ่านวันที่ในไฟล์เดิม');return '';}
    if(options.dateMode==='be-short'){const be=Math.floor(Number(year)/100)*100+d.y%100;d.y=be-543;const k=old+'→'+d.y;if(!dateWarnings.has(k))dateWarnings.set(k,{location:where,message:'เลือกอ่านปี '+old+' เป็น พ.ศ. ย่อ จึงใช้ ค.ศ. '+d.y+' (ใช้กับช่องรูปแบบเดียวกันในไฟล์นี้)'});}
    else if(!dateWarnings.has('excel'))dateWarnings.set('excel',{location:where,message:'เลือกใช้วันที่ตามค่าจริง Excel รวมปี 19xx โดยไม่แปลงเป็น พ.ศ. ย่อ'});
   }
   return String(d.y).padStart(4,'0')+'-'+String(d.m).padStart(2,'0')+'-'+String(d.d).padStart(2,'0');
  }
  for(const plan of plans){const sheetNames=book.SheetNames.filter(n=>new RegExp('^'+plan.id+'\\.').test(n));if(sheetNames.length!==1){add('error',plan.location,'ต้องพบแท็บทะเบียนของโครงการ '+plan.id+' เพียงแท็บเดียว');continue;}const sheetName=sheetNames[0],ws=book.Sheets[sheetName],rs=grid(ws),sh=header(rs);if(!sh){add('error',loc(sheetName,1),'ไม่พบหัวตารางโครงการ');continue;}
   const headers=[];rs.forEach((row,r)=>{if(norm(row[1])==='วันที่'&&norm(row[2])==='รายการ'&&norm(row[5])==='คงเหลือ')headers.push(r);else if(/^(เงินรายได้|เงินอุดหนุน|เงินกิจกรรมพัฒนาผู้เรียน)$/.test(clean(row[2]))&&typeof row[5]==='number')headers.push(r);});if(!headers.length){add('error',loc(sheetName,1),'ไม่พบหัวทะเบียนรับ–จ่าย');continue;}
   const meta=[];for(let r=sh.r+3;r<headers[0];r++){const row=rs[r],name=clean(row[sh.name]),id=clean(row[sh.id]);if(!name)continue;const isProject=Number(row[sh.id])===plan.id&&name.startsWith('โครงการ'),isActivity=/^[-–]/.test(name);if(!isProject&&!isActivity)continue;for(let f=0;f<4;f++){const c=sh.fundCols[f],v=amount(row[c],loc(sheetName,X.utils.encode_cell({r,c})));if(v!=null)meta.push({r,c,f,value:v,activity:isActivity?name.replace(/^[-–]\s*/,''):'',code:id});}}
   for(let i=0;i<headers.length;i++){const start=headers[i],end=headers[i+1]??rs.length,registerId='P'+plan.id+'-R'+(start+1),where=loc(sheetName,'A'+(start+1)),mappingKey=file.name+'|'+registerId;
    const finance=[];for(let r=start+1;r<end;r++){const row=rs[r],operational=[0,1,2].some(c=>clean(row[c])!==''),hasMoney=[3,4,5].some(c=>typeof row[c]==='number');if(!operational&&hasMoney){const isOpening=!finance.length&&typeof row[3]==='number'&&(typeof row[4]!=='number'||row[4]===0);if(isOpening){finance.push({r,row,openingOnly:true});continue;}if([3,4].some(c=>typeof row[c]==='number')){warn(loc(sheetName,r+1),'แถวมีจำนวนเงินแต่ไม่มีเลขเอกสาร วันที่ และรายการ อาจเป็นยอดรวม จัดเก็บเป็นข้อมูลตรวจสอบ ไม่รวมเป็นรายการรับ–จ่าย');audit.push({location:loc(sheetName,r+1),kind:'unclassified-money-row',values:row});}continue;}if(operational&&hasMoney)finance.push({r,row});}
    let initial=finance.find(x=>typeof x.row[3]==='number'),opening=initial?amount(initial.row[3],loc(sheetName,'D'+(initial.r+1))):typeof rs[start][5]==='number'?amount(rs[start][5],loc(sheetName,'F'+(start+1))):null,candidates=[],activity='';
    if(initial){const f=ws['D'+(initial.r+1)]?.f?.match(/^=?\$?([A-Z]+)\$?(\d+)$/);if(f){const at=X.utils.decode_cell(f[1]+f[2]),m=meta.find(m=>m.r===at.r&&m.c===at.c);if(m){candidates.push({f:m.f,reason:'สูตรตั้งต้นอ้าง '+f[1]+f[2]});activity=m.activity;}}}
    if(!candidates.length&&opening!=null){const ms=meta.filter(m=>m.value===opening);const funds=[...new Set(ms.map(m=>m.f))];if(funds.length===1)candidates.push({f:funds[0],reason:'ยอดตั้งต้นตรงกับช่องประเภทเงินในตารางโครงการ'});}
    const context=clean(rs[start][2])+' '+rs.slice(Math.max(headers[i-1]==null?headers[0]:headers[i-1]+1,start-2),start).flat().map(clean).join(' ')+' '+finance.slice(0,1).map(x=>clean(x.row[6])).join(' ');
    if(/รายได้/.test(context))candidates.push({f:2,reason:'ข้อความกำกับทะเบียนระบุรายได้'});if(/อุดหนุน|รายหัว/.test(context))candidates.push({f:0,reason:'ข้อความกำกับทะเบียนระบุอุดหนุนรายหัว'});if(/กิจกรรมพัฒนาผู้เรียน/.test(context))candidates.push({f:1,reason:'ข้อความกำกับทะเบียนระบุกิจกรรมพัฒนาผู้เรียน'});
    const summaryRefs=refs.filter(x=>x.projectId===plan.id&&x.sheet===sheetName&&x.row>start&&x.row<end);for(const r of summaryRefs)candidates.push({f:r.fund,reason:'ยอดคงเหลืออ้างทะเบียนจาก '+r.location});
    if(!candidates.length){const unique=[...new Set(meta.map(m=>m.f))];if(unique.length===1)candidates.push({f:unique[0],reason:'ตารางโครงการมีเงินประเภทเดียว'});}
    const distinct=[...new Set(candidates.map(c=>c.f))],override=options.fundOverrides?.[mappingKey];let fund=M.funds.includes(override)?override:distinct.length===1?M.funds[distinct[0]]:'';
    if(M.funds.includes(override))warn(where,'ผู้ใช้เลือกประเภทเงิน '+override+' หลังตรวจจุดอ้างอิง');else if(distinct.length>1)warn(where,'ประเภทเงินจากจุดอ้างอิงขัดกัน: '+candidates.map(c=>M.funds[c.f]+' ('+c.reason+')').join(' / '));
    if(!fund||distinct.length>1)mappings.push({key:mappingKey,location:where,project:plan.name,registerId,selected:fund,candidates:candidates.map(c=>({fund:M.funds[c.f],reason:c.reason}))});
    if(!activity){const marker=clean(rs[start-1]?.[2]);const ms=meta.filter(m=>m.code===marker&&m.activity);if(marker&&new Set(ms.map(m=>m.activity)).size===1)activity=ms[0].activity;}
    if(opening==null){const f=M.funds.indexOf(fund),projectAmounts=meta.filter(m=>!m.activity&&(f<0||m.f===f));if(projectAmounts.length===1){opening=projectAmounts[0].value;warn(where,'ไม่มีแถวเงินตั้งต้นในทะเบียน ใช้ยอดจากตารางโครงการและแจ้งให้ตรวจสอบ');}else {opening=0;add('error',where,'ไม่พบเงินตั้งต้นที่อ้างอิงได้แน่นอน');}}
    if(!initial&&typeof rs[start][5]==='number')warn(where,'ทะเบียนย่อยเริ่มจากยอดยกมาในช่องคงเหลือ ไม่ใช่ยอดจัดสรรทั้งปี');
    const entries=[];let balance=M.cents(opening),last=opening;
    for(const x of finance){const row=x.row,r=x.r,inc=x===initial?0:amount(row[3],loc(sheetName,'D'+(r+1)))??0,spent=amount(row[4],loc(sheetName,'E'+(r+1)))??0;if(x.openingOnly){if(typeof row[5]==='number')last=amount(row[5],loc(sheetName,'F'+(r+1)));continue;}
     const description=clean(row[2]),number=clean(row[0]),dateValue=date(ws['B'+(r+1)],loc(sheetName,'B'+(r+1))),declared=amount(row[5],loc(sheetName,'F'+(r+1)));balance+=M.cents(inc)-M.cents(spent);
     if(declared!=null)last=declared;else {last=M.money(balance);warn(loc(sheetName,'F'+(r+1)),'ไม่มีผลคงเหลือรายแถว ใช้ยอดคำนวณในตัวอย่าง');}
     const note=row.slice(6).map((v,c)=>clean(v)?X.utils.encode_col(c+6)+': '+clean(v):'').filter(Boolean).join(' / ');
     entries.push({date:dateValue,number,description,spent,received:inc,declaredRemaining:declared,note,legacy:true,location:loc(sheetName,r+1)});
     const formula=ws['F'+(r+1)]?.f;if(spent>0&&!formula&&declared==null)warn(loc(sheetName,'F'+(r+1)),'สูตรคงเหลือขาดและไม่มีผลที่บันทึกไว้');
    }
    const knownAllocated=meta.filter(m=>m.activity===activity&&M.funds[m.f]===fund);const allocated=knownAllocated.length===1?knownAllocated[0].value:opening;
    const u={projectId:plan.id,department:plan.department,projectName:plan.name,owner:plan.owner,activity,fund,registerId,location:where,allocated,received:opening,declaredRemaining:last,entries};units.push(u);
    for(const ref of summaryRefs)if(ref.value!=null&&M.cents(ref.value)!==balance)warn(ref.location,'ยอดสรุปอ้างแถว '+(ref.row+1)+' ไม่ตรงปลายทะเบียน '+where+': สรุป '+ref.value+' / คำนวณ '+M.money(balance));
   }
   for(let f=0;f<4;f++){const allocation=plan.amounts[f],activitySum=plan.activities.map(a=>a.amounts[f]).filter(v=>v!=null).reduce((s,v)=>s+M.cents(v),0);if(activitySum&&M.cents(allocation||0)!==activitySum)warn(plan.location,'ผลรวมวงเงินกิจกรรม '+M.funds[f]+' = '+M.money(activitySum)+' ต่างจากแผนโครงการ '+allocation);}
  }
  for(const w of dateWarnings.values())warnings.push(w);
  for(const control of audit.filter(a=>a.kind==='plan-control')){const ps=plans.filter(p=>p.department===control.department);const total=ps.reduce((s,p)=>s+p.amounts.reduce((n,v)=>n+M.cents(v||0),0),0);if(control.label.includes('รวมฝ่าย')){const declared=control.amounts.find(v=>v!=null);if(declared!=null&&M.cents(declared)!==total)warn(control.location,'ยอดรวมฝ่าย '+declared+' ต่างจากผลรวมแผนโครงการ '+M.money(total));}else for(let f=0;f<4;f++){const expected=ps.reduce((s,p)=>s+M.cents(p.amounts[f]||0),0),declared=control.amounts[f];if(declared!=null&&M.cents(declared)!==expected)warn(control.location,'ยอดรวมแผน '+M.funds[f]+' '+declared+' ต่างจากผลรวมรายโครงการ '+M.money(expected));}}
  if(units.every(u=>M.funds.includes(u.fund))){const summary=M.summary({year:Number(year),units,plans,borrowing:[]},'preview');for(const control of audit.filter(a=>a.kind==='balance-control')){const dept=summary.departments.find(d=>d.name===control.department);if(!dept)continue;for(let f=0;f<4;f++)if(control.amounts[f]!=null&&M.cents(control.amounts[f])!==M.cents(dept.remaining[f]))warn(control.location,'ยอดคงเหลือสรุปฝ่าย '+M.funds[f]+' = '+control.amounts[f]+' ต่างจากทะเบียนคำนวณ '+dept.remaining[f]);}}

  const known=new Set([planName,balanceName,...plans.flatMap(p=>book.SheetNames.filter(n=>new RegExp('^'+p.id+'\\.').test(n)))]);for(const name of book.SheetNames)if(!known.has(name))add('error',file.name+'/'+name,'พบชีตเพิ่มเติมที่ยังไม่ทราบวิธีนำเข้า ไม่ข้ามข้อมูลอัตโนมัติ');
  return {units,plans,warnings,issues,audit,mappings,sourceFormat:'legacy-2569'};
 }
 const api={parseFile};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.BudgetLegacyImport=api;
})(typeof window==='undefined'?globalThis:window);
