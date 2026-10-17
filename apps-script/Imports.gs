/* Private annual versions share the existing private account spreadsheet. */
const IMPORT_DB='1gDQDWTbkTSRz2iYPz2TXbuXYxqt6-nxeJdmAbJkptcY';
function requireBudgetImporter_(token){const u=requireBudgetAdmin_(token);if(u.id!=='teanpak.su')throw Error('เฉพาะ teanpak.su เท่านั้นที่อัปเดตหรือย้อนกลับข้อมูลได้');return u;}
function importIndex_(create){const book=SpreadsheetApp.openById(IMPORT_DB);let sheet=book.getSheetByName('_BudgetVersions');if(!sheet&&create){sheet=book.insertSheet('_BudgetVersions');sheet.appendRow(['id','year','time','user','action','parent','source','projects','files','warnings']);sheet.setFrozenRows(1);}return sheet;}
function importRows_(){const sheet=importIndex_(false);return sheet?sheet.getDataRange().getValues().slice(1):[];}
function importRevision_(year){return PropertiesService.getScriptProperties().getProperty('budget-import-'+budgetYear_(year))||'legacy';}
function importLoad_(id){if(!id||id==='legacy')return null;if(!/^[a-f0-9-]{36}$/.test(id))throw Error('เวอร์ชันไม่ถูกต้อง');const sheet=SpreadsheetApp.openById(IMPORT_DB).getSheetByName('_BI_'+id);if(!sheet)throw Error('ไม่พบข้อมูลเวอร์ชัน');return JSON.parse(sheet.getDataRange().getValues().map(r=>String(r[0]).slice(2)).join(''));}
function importCurrent_(year){return importLoad_(importRevision_(year));}
function getBudgetImportHistory(year,token){requireBudgetImporter_(token);year=budgetYear_(year);const rows=importRows_().filter(r=>Number(r[1])===year);return {year,revision:importRevision_(year),versions:rows.reverse().map(r=>({id:r[0],year:r[1],createdAt:r[2],user:r[3],action:r[4],parent:r[5],source:r[6],projects:r[7],files:JSON.parse(r[8]||'[]'),warnings:r[9]}))};}
function importSave_(payload,user,action,parent,source){
 const id=Utilities.getUuid();payload.savedAt=new Date().toISOString();const text=JSON.stringify(payload);if(text.length>4000000)throw Error('ชุดข้อมูลเกินขนาด 4 MB กรุณาลดรายการหรือแยกไฟล์');
 const book=SpreadsheetApp.openById(IMPORT_DB),sheet=book.insertSheet('_BI_'+id),chunks=text.match(/[\s\S]{1,35000}/g)||[''];sheet.getRange(1,1,chunks.length,1).setNumberFormat('@').setValues(chunks.map(s=>['J:'+s]));if(sheet.getMaxRows()>chunks.length)sheet.deleteRows(chunks.length+1,sheet.getMaxRows()-chunks.length);if(sheet.getMaxColumns()>1)sheet.deleteColumns(2,sheet.getMaxColumns()-1);sheet.hideSheet();
 const report=BudgetImportModel.check(payload,payload.year);if(!report.valid)throw Error('ข้อมูลไม่ผ่านการตรวจสอบฝั่งเซิร์ฟเวอร์');
 importIndex_(true).appendRow([id,payload.year,payload.savedAt,user.id,action,parent,source||'',report.projects,JSON.stringify(payload.files),report.issues.filter(i=>i.level==='warning').length]);SpreadsheetApp.flush();
 PropertiesService.getScriptProperties().setProperty('budget-import-'+payload.year,id);return {id,year:payload.year,createdAt:payload.savedAt,projects:report.projects};
}
function publishBudgetYearImport(input,token){const user=requireBudgetImporter_(token),lock=LockService.getScriptLock();lock.waitLock(20000);try{
 const year=budgetYear_(input.year);
 if(typeof input.requestId!=='string'||!/^[a-f0-9-]{36}$/.test(input.requestId))throw Error('รหัสคำขอไม่ถูกต้อง');
 const replay=importRows_().find(r=>Number(r[1])===year&&r[6]==='request:'+input.requestId);if(replay)return {id:replay[0],year};
 if(input.expectedRevision!==importRevision_(year))throw Error('ข้อมูลปีนี้เปลี่ยนแล้ว กรุณาโหลดประวัติและตรวจสอบใหม่');
 if(JSON.stringify(input.payload).length>4000000)throw Error('ข้อมูลเกินขนาด');
 const payload=JSON.parse(JSON.stringify(input.payload));payload.year=year;payload.borrowing=[];
 const report=BudgetImportModel.check(payload,year);if(!report.valid)throw Error('ข้อมูลไม่ผ่านการตรวจสอบ: '+report.issues.filter(i=>i.level==='error').slice(0,3).map(i=>i.location+': '+i.message).join(' / '));
 if(report.issues.some(i=>i.level==='warning')&&input.acknowledgeWarnings!==true)throw Error('กรุณายืนยันรับทราบคำเตือน');
 if(input.confirmYear!==String(year))throw Error('กรุณายืนยันปีงบประมาณ');
 return importSave_(payload,user,'import',input.expectedRevision,'request:'+input.requestId);
 }finally{lock.releaseLock();}}
function restoreBudgetYearImport(input,token){const user=requireBudgetImporter_(token),year=budgetYear_(input.year),lock=LockService.getScriptLock();lock.waitLock(20000);try{
 if(input.confirmYear!==String(year)||input.expectedRevision!==importRevision_(year))throw Error('ปีหรือเวอร์ชันเปลี่ยนแล้ว กรุณาโหลดใหม่');
 if(input.id==='legacy'){
  const id=Utilities.getUuid(),now=new Date().toISOString();importIndex_(true).appendRow([id,year,now,user.id,'restore',input.expectedRevision,'legacy',0,'[]',0]);SpreadsheetApp.flush();PropertiesService.getScriptProperties().deleteProperty('budget-import-'+year);return {id,year};
 }
 const source=importRows_().find(r=>r[0]===input.id&&Number(r[1])===year);if(!source)throw Error('ไม่พบเวอร์ชันในปีงบประมาณนี้');
 const payload=importLoad_(input.id);if(!payload||Number(payload.year)!==year)throw Error('เวอร์ชันไม่มีข้อมูลให้ย้อนกลับ');
 return importSave_(payload,user,'restore',input.expectedRevision,input.id);
 }finally{lock.releaseLock();}}
// Public projection excludes ledger entries, loan details and upload account IDs.
function getBudgetYearSnapshot(year){year=budgetYear_(year);const id=importRevision_(year),payload=importLoad_(id);return payload?BudgetImportModel.summary(payload,id):null;}
function readRegister_(id,year){year=budgetYear_(year);const revision=importRevision_(year),payload=importLoad_(revision);return payload?BudgetImportModel.state(payload,id,revision):readLegacyRegister_(id,year);}
function getBudgetRegister(id,year,token){if(token===undefined){token=year;year=2569;}getBudgetUser(token);return readRegister_(id,year);}
function importEndpoint_(state,index){const b=state.blocks[Number(index)];if(!b)throw Error('ไม่พบทะเบียน');return {projectId:state.projectId,blockIndex:b.blockIndex,activity:b.activity,budgetType:b.budgetType,name:state.sheetName,headerRow:b.headerRow};}
function saveBudgetEntry(input,token){const user=requireBudgetAdmin_(token);if(importRevision_(input.year)==='legacy')return saveBudgetEntryLegacy_(input,token);const lock=LockService.getScriptLock();lock.waitLock(20000);try{
 const id=importRevision_(input.year),payload=importLoad_(id);if(!payload)throw Error('ข้อมูลเปลี่ยนแล้ว กรุณาโหลดใหม่');
 const state=BudgetImportModel.state(payload,input.projectId,id);const replay=payload.units.flatMap(u=>u.entries).find(e=>e.requestId===input.requestId);if(replay)return {row:replay.row,remaining:replay.remaining,used:replay.used};
 if(input.revision!==id)throw Error('ยอดเปลี่ยนแล้ว กรุณาโหลดใหม่');const b=state.blocks.find(b=>b.headerRow===Number(input.headerRow));if(!b)throw Error('ไม่พบทะเบียน');
 const spent=Number(input.spent);if(!Number.isFinite(spent)||spent<=0||Math.abs(spent*100-Math.round(spent*100))>.0001||spent>b.current)throw Error('จำนวนเงินไม่ถูกต้องหรือยอดคงเหลือไม่พอ');
 if(!/^[a-zA-Z0-9-]{16,80}$/.test(input.requestId||''))throw Error('รหัสคำขอไม่ถูกต้อง');
 const entry={requestId:input.requestId,date:String(input.date||''),number:safeText_(input.number,80),description:safeText_(input.description,500),note:safeText_(input.note,500),spent};
 const u=payload.units.filter(u=>u.projectId===state.projectId)[b.blockIndex];u.entries.push(entry);u.declaredRemaining=Math.round((b.ledgerCurrent-spent)*100)/100;
 const result={row:u.entries.length+1,remaining:Math.round((b.current-spent)*100)/100,used:Math.round((b.used+spent)*100)/100};Object.assign(entry,result);
 const check=BudgetImportModel.check(payload,payload.year);if(!check.valid)throw Error('ข้อมูลวันที่หรือรายการไม่ถูกต้อง');importSave_(payload,user,'entry',id,input.requestId);return result;
 }finally{lock.releaseLock();}}
function saveBudgetBorrowing(input,token){const user=requireBudgetAdmin_(token);if(importRevision_(input.year)==='legacy')return saveBudgetBorrowingLegacy_(input,token);const lock=LockService.getScriptLock();lock.waitLock(20000);try{
 const id=importRevision_(input.year),p=importLoad_(id);if(!p)throw Error('ข้อมูลเปลี่ยนแล้ว กรุณาโหลดใหม่');p.borrowing=p.borrowing||[];const replay=p.borrowing.find(r=>r.id===input.requestId);if(replay)return replay;
 if(input.sourceRevision!==id||input.destinationRevision!==id)throw Error('ยอดเปลี่ยนแล้ว กรุณาโหลดใหม่');
 const from=BudgetImportModel.state(p,input.sourceProjectId,id),to=BudgetImportModel.state(p,input.destinationProjectId,id),source=importEndpoint_(from,input.sourceBlockIndex),destination=importEndpoint_(to,input.destinationBlockIndex);
 const a=from.blocks[source.blockIndex],b=to.blocks[destination.blockIndex],amount=Number(input.amount);
 if(!Number.isFinite(amount)||amount<=0||Math.abs(amount*100-Math.round(amount*100))>.0001||amount>a.current)throw Error('ยอดไม่ถูกต้องหรือไม่พอยืม');
 if(source.budgetType!==destination.budgetType||(source.projectId===destination.projectId&&source.blockIndex===destination.blockIndex))throw Error('ต้องเป็นคนละทะเบียนและประเภทเงินเดียวกัน');
 if(!/^[a-zA-Z0-9-]{16,80}$/.test(input.requestId||'')||!/^\d{4}-\d{2}-\d{2}$/.test(input.date||''))throw Error('รหัสหรือวันที่ไม่ถูกต้อง');
 const record={id:input.requestId,kind:'borrow',year:p.year,source,destination,budgetType:source.budgetType,amount,number:safeText_(input.number,80),date:input.date,reason:safeText_(input.reason,500),userId:user.id,createdAt:new Date().toISOString(),sourceBefore:a.current,sourceAfter:Math.round((a.current-amount)*100)/100,destinationBefore:b.current,destinationAfter:Math.round((b.current+amount)*100)/100};if(!record.number||!record.reason)throw Error('กรอกเลขเอกสารและเหตุผล');
 p.borrowing.push(record);importSave_(p,user,'borrow',id,record.id);return record;
 }finally{lock.releaseLock();}}
function cancelBudgetBorrowing(input,token){const user=requireBudgetAdmin_(token);if(importRevision_(input.year)==='legacy')return cancelBudgetBorrowingLegacy_(input,token);const lock=LockService.getScriptLock();lock.waitLock(20000);try{
 const id=importRevision_(input.year),p=importLoad_(id);if(!p)throw Error('ข้อมูลเปลี่ยนแล้ว กรุณาโหลดใหม่');const original=(p.borrowing||[]).find(r=>r.id===input.id&&r.kind==='borrow');if(!original)throw Error('ไม่พบรายการ');const replay=p.borrowing.find(r=>r.kind==='cancel'&&r.referenceId===original.id);if(replay)return replay;
 const state=BudgetImportModel.state(p,original.destination.projectId,id),b=state.blocks[original.destination.blockIndex];if(b.current-original.amount<Math.min(0,original.destinationBefore))throw Error('ยอดปลายทางไม่พอคืน');
 const record=Object.assign({},original,{id:Utilities.getUuid(),kind:'cancel',referenceId:original.id,userId:user.id,createdAt:new Date().toISOString(),reason:'ยกเลิกการยืม: '+original.reason});p.borrowing.push(record);importSave_(p,user,'cancel-borrow',id,record.id);return record;
 }finally{lock.releaseLock();}}
function getBudgetAdjustmentSummary(year){if(importRevision_(year)!=='legacy')return {year:budgetYear_(year),projects:{}};return getBudgetAdjustmentSummaryLegacy_(year);}
