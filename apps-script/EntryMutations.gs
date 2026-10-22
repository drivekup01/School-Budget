/* Reversible cancellation and audited edits; existing source rows are never deleted. */
function entryMutationText_(input){
 const spent=Number(input.spent);if(!Number.isFinite(spent)||spent<=0||Math.abs(spent*100-Math.round(spent*100))>.00001)throw Error('จำนวนเงินต้องมากกว่า 0 และมีทศนิยมไม่เกิน 2 ตำแหน่ง');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(input.date||''))throw Error('วันที่ไม่ถูกต้อง');const date=Utilities.parseDate(input.date+' 12:00','Asia/Bangkok','yyyy-MM-dd HH:mm');if(Utilities.formatDate(date,'Asia/Bangkok','yyyy-MM-dd')!==input.date)throw Error('วันที่ไม่ถูกต้อง');
 const number=safeText_(input.number,80),description=safeText_(input.description,500),note=safeText_(input.note,500);if(!number||!description)throw Error('กรอกเลขเอกสารและรายการให้ครบ');if(/ยกเลิกรายการ \[[a-f0-9-]{36}\]/.test(note))throw Error('หมายเหตุมีรหัสระบบ');return {number,date,description,spent,note};
}
function entryAuditSheet_(book){let s=book.getSheetByName('_BudgetEntryAudit');if(!s){s=book.insertSheet('_BudgetEntryAudit');s.appendRow(['id','time','user','year','project','sheetId','row','action','before','after','requestId','status']);s.hideSheet();}return s;}
function mutateBudgetEntry(input,token){
 const user=requireBudgetAdmin_(token),year=budgetYear_(input.year),lock=LockService.getScriptLock();if(!['edit','delete','restore'].includes(input.action)||!/^[a-f0-9-]{36}$/.test(input.requestId||''))throw Error('คำขอไม่ถูกต้อง');lock.waitLock(20000);
 try{
  if(importRevision_(year)!=='legacy')return mutateImportedEntry_(input,user);
  const target=projectSheet_(input.projectId,year),sheet=target.sheet,replay=sheet.getDeveloperMetadata().find(m=>m.getKey()==='budget-mutation-'+input.requestId);
  if(replay)return Object.assign(JSON.parse(replay.getValue()),{state:readRegister_(input.projectId,year)});
  const state=readRegister_(input.projectId,year);if(state.revision!==input.revision)throw Error('ข้อมูลเปลี่ยนแล้ว กรุณาโหลดล่าสุดก่อนแก้ไข');
  const block=state.blocks.find(b=>b.headerRow===Number(input.headerRow)),entry=block?.entries.find(e=>e.row===Number(input.row));if(!entry)throw Error('ไม่พบรายการในทะเบียนนี้');
  const marker=String(entry.note||'').match(/^ยกเลิกรายการ \[([a-f0-9-]{36})\]$/),isDeleted=!!marker;
  if(input.action==='restore'?!isDeleted:isDeleted)throw Error('สถานะรายการเปลี่ยนแล้ว');if(!isDeleted&&!(entry.spent>0))throw Error('แก้ไขได้เฉพาะรายการจ่ายเงิน');
  const row=Number(input.row),noteColumn=block.noteColumn||7,usedColumn=block.usedColumn||8,width=Math.max(8,noteColumn,usedColumn),before=sheet.getRange(row,1,1,width).getValues()[0],after=before.slice(),audit=entryAuditSheet_(target.book),id=Utilities.getUuid();
  if(input.action==='edit'){const v=entryMutationText_(input);after[0]=v.number;after[1]=v.date;after[2]=v.description;after[4]=v.spent;after[noteColumn-1]=v.note;}
  if(input.action==='delete'){after[4]=0;after[noteColumn-1]='ยกเลิกรายการ ['+id+']';}
  if(input.action==='restore'){const record=audit.getDataRange().getValues().find(r=>r[0]===marker[1]&&r[11]==='committed'&&Number(r[4])===Number(input.projectId));if(!record)throw Error('ไม่พบข้อมูลสำหรับกู้คืน');const original=JSON.parse(record[8]);after[0]=original[0];after[1]=typeof original[1]==='string'&&/^\d{4}-\d\d-\d\dT/.test(original[1])?new Date(original[1]):original[1];after[2]=original[2];after[4]=original[4];after[noteColumn-1]=original[noteColumn-1];}
  const difference=entry.spent-Number(after[4]);if(difference<0&&block.current+difference<Math.min(0,block.current)-.001)throw Error('ยอดคงเหลือไม่เพียงพอ');
  const range=sheet.getDataRange(),values=range.getValues(),formulas=typeof range.getFormulas==='function'?range.getFormulas():[],end=state.blocks.find(b=>b.headerRow>block.headerRow)?.headerRow-1||values.length,start=block.headerRow+1,changes=[];
  for(let r=start;r<=end;r++){const v=r===row?after:values[r-1];if(typeof v?.[3]==='number'||typeof v?.[4]==='number')changes.push(r);}
  const auditRow=audit.getLastRow()+1;audit.appendRow([id,new Date(),user.id,year,Number(input.projectId),sheet.getSheetId(),row,input.action,JSON.stringify(before),JSON.stringify(after),input.requestId,'pending']);
  const fields=[0,1,2,4,noteColumn-1],last=Math.max(...changes),count=last-start+1;
  const write=after.map((v,c)=>fields.includes(c)?v:formulas[row-1]?.[c]||v);
  try{
   sheet.getRange(row,1,1,width).setValues([write]);
   sheet.getRange(start,6,count,1).setValues(Array.from({length:count},(_,i)=>['=SUM(D'+start+':D'+(start+i)+')-SUM(E'+start+':E'+(start+i)+')']));
   sheet.getRange(start,usedColumn,count,1).setValues(Array.from({length:count},(_,i)=>['=SUM(E'+start+':E'+(start+i)+')']));SpreadsheetApp.flush();
  }catch(error){
   try{sheet.getRange(row,1,1,width).setValues([before.map((v,c)=>formulas[row-1]?.[c]||v)]);for(const c of [6,usedColumn])sheet.getRange(start,c,count,1).setValues(Array.from({length:count},(_,i)=>[formulas[start+i-1]?.[c-1]||(values[start+i-1]?.[c-1]??'')]));SpreadsheetApp.flush();audit.getRange(auditRow,12).setValue('rolled-back');}
   catch(restoreError){audit.getRange(auditRow,12).setValue('needs-recovery');throw Error('ยังยืนยันผลไม่ได้ กรุณาโหลดข้อมูลล่าสุดและตรวจประวัติการแก้ไข');}throw Error('บันทึกไม่สำเร็จ ระบบคืนข้อมูลเดิมแล้ว กรุณาโหลดล่าสุดก่อนลองอีกครั้ง');
  }
  audit.getRange(auditRow,12).setValue('committed');invalidatePrimary2570_(year,[input.projectId]);const fresh=readRegister_(input.projectId,year),b=fresh.blocks.find(b=>b.headerRow===block.headerRow),result={row,action:input.action,remaining:b.current,used:b.used};sheet.addDeveloperMetadata('budget-mutation-'+input.requestId,JSON.stringify(result));result.state=fresh;return result;
 }finally{lock.releaseLock();}
}
function mutateImportedEntry_(input,user){
 const revision=importRevision_(input.year),p=importLoad_(revision),replay=(p.entryMutations||[]).find(m=>m.requestId===input.requestId);if(replay)return {state:BudgetImportModel.state(p,input.projectId,revision)};
 if(revision!==input.revision)throw Error('ข้อมูลเปลี่ยนแล้ว กรุณาโหลดล่าสุดก่อนแก้ไข');const state=BudgetImportModel.state(p,input.projectId,revision),b=state.blocks.find(b=>b.headerRow===Number(input.headerRow)),u=p.units.filter(u=>u.projectId===Number(input.projectId))[b?.blockIndex],i=Number(input.row)-2,e=u?.entries[i];if(!e)throw Error('ไม่พบรายการ');
 const before=JSON.parse(JSON.stringify(e));if(input.action==='restore'){const record=(p.entryMutations||[]).slice().reverse().find(m=>m.projectId===Number(input.projectId)&&m.blockIndex===b.blockIndex&&m.index===i&&m.action==='delete');if(!e.deleted||!record)throw Error('ไม่พบข้อมูลกู้คืน');u.entries[i]=JSON.parse(JSON.stringify(record.before));}else{if(e.deleted||!(e.spent>0))throw Error('รายการนี้แก้ไขไม่ได้');if(input.action==='delete'){e.deleted=true;e.spent=0;e.legacy=true;}else{const v=entryMutationText_(input);Object.assign(e,v,{date:input.date});}}
 const difference=before.spent-u.entries[i].spent;if(difference<0&&b.current+difference<Math.min(0,b.current)-.001)throw Error('ยอดคงเหลือไม่เพียงพอ');u.declaredRemaining=Math.round((b.ledgerCurrent+difference)*100)/100;
 for(const item of u.entries)delete item.declaredRemaining;
 (p.entryMutations=p.entryMutations||[]).push({requestId:input.requestId,projectId:Number(input.projectId),registerId:u.registerId,blockIndex:b.blockIndex,index:i,action:input.action,before,user:user.id,time:new Date().toISOString()});const result=importSave_(p,user,'entry-'+input.action,revision,input.requestId);return {state:BudgetImportModel.state(p,input.projectId,result.id)};
}
