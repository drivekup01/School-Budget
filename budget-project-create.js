/* Project and activity creation for budget managers. */
(() => {
 'use strict';
 const funds=['เงินอุดหนุนรายหัว','เงินกิจกรรมพัฒนาผู้เรียน','เงินรายได้สถานศึกษา','อื่น ๆ'];
 const departments=['ฝ่ายบริหารงานวิชาการ','ฝ่ายบริหารงานงบประมาณ','ฝ่ายบริหารงานบุคคล','ฝ่ายบริหารงานทั่วไป'];
 const toolbar=document.createElement('div');toolbar.className='project-create-actions';toolbar.hidden=true;
 toolbar.innerHTML='<button type="button" data-kind="project">+ เพิ่มโครงการ</button><button type="button" data-kind="activity">+ เพิ่มกิจกรรม</button>';
 document.querySelector('#projects .panel-title').after(toolbar);
 const dialog=document.createElement('dialog');dialog.className='project-create-dialog allocation-editor';
 dialog.innerHTML='<form><h2></h2><p class="create-hint">ยอดตั้งต้นที่กรอกจะเพิ่มเข้างบรวมของโครงการและฝ่ายงาน หากยังไม่จัดสรรงบให้กรอก 0 บาท งบและประวัติเดิมจะยังคงอยู่</p><label>ฝ่ายงาน<select name="department" required></select></label><label data-project-field>โครงการ<select name="project"></select></label><label><span data-name-label></span><input name="itemName" maxlength="240" required></label><label>ผู้รับผิดชอบ<input name="owner" maxlength="200" required></label><label>ประเภทงบประมาณ<select name="fund" required></select></label><label>ยอดตั้งต้น (บาท)<input name="amount" type="number" min="0" max="1000000000" step="0.01" value="0" required></label><p role="status" aria-live="polite"></p><div class="project-create-actions"><button type="button" data-close>ยกเลิก</button><button type="submit">บันทึก</button></div></form>';
 document.body.append(dialog);const form=dialog.querySelector('form'),e=form.elements,status=dialog.querySelector('[role=status]');let snapshot,kind,busy=false,request;
 function options(select,items,placeholder){select.replaceChildren(new Option(placeholder,''));items.forEach(([value,label])=>select.add(new Option(label,value)));}
 options(e.department,departments.map(d=>[d,d]),'เลือกฝ่าย');options(e.fund,funds.map(f=>[f,f]),'เลือกประเภทงบประมาณ');
 function projects(){options(e.project,(snapshot?.projects||[]).filter(p=>p.department===e.department.value).sort((a,b)=>a.id-b.id).map(p=>[String(p.id),p.name]),'เลือกโครงการ');}
 e.department.onchange=projects;
 toolbar.onclick=event=>{const button=event.target.closest('[data-kind]');if(!button||busy)return;kind=button.dataset.kind;form.reset();form.querySelectorAll('input,select,button').forEach(n=>n.disabled=false);request=null;status.textContent='';e.project.required=kind==='activity';dialog.querySelector('[data-project-field]').hidden=kind!=='activity';dialog.querySelector('h2').textContent=kind==='project'?'เพิ่มโครงการ':'เพิ่มกิจกรรม';dialog.querySelector('[data-name-label]').textContent=kind==='project'?'ชื่อโครงการ':'ชื่อกิจกรรม';e.department.value=document.getElementById('department').value;projects();e.project.value=document.getElementById('project').value;dialog.showModal();};
 dialog.querySelector('[data-close]').onclick=()=>{if(!busy)dialog.close();};dialog.addEventListener('cancel',event=>{if(busy)event.preventDefault();});form.addEventListener('input',()=>request=null);
 form.onsubmit=async event=>{event.preventDefault();if(busy||window.schoolUser?.canImportBudgetAllocation!==true)return;busy=true;form.querySelectorAll('input,select,button').forEach(n=>n.disabled=true);status.textContent='กำลังบันทึก…';let saved=false;
 try{if(!request){request={kind,year:Number(window.budgetYear),department:e.department.value,name:e.itemName.value.trim(),owner:e.owner.value.trim(),budgetType:e.fund.value,amount:Number(e.amount.value),requestId:crypto.randomUUID()};if(kind==='activity'){request.projectId=Number(e.project.value);const state=await window.schoolRpc('getBudgetRegister',request.projectId,request.year);request.revision=state.revision;}}
 await window.schoolRpc('createBudgetProjectItem',request);saved=true;status.textContent='บันทึกแล้ว';const data=await window.fetchBudgetYearData(request.year,{force:true});window.dispatchEvent(new CustomEvent('budget-data-updated',{detail:data}));location.reload();
 }catch(error){if(request?.kind==='activity'&&!request.revision)request=null;status.textContent=saved?'บันทึกแล้ว กรุณารีเฟรชหน้าเว็บเพื่อดูรายการใหม่':error.message;}finally{busy=false;form.querySelectorAll('input,select,button').forEach(n=>n.disabled=false);if(saved)form.querySelector('[type=submit]').disabled=true;}};
 window.addEventListener('budget-data-updated',event=>{snapshot=event.detail;});
 (window.schoolAuthReady||Promise.resolve()).then(()=>{toolbar.hidden=window.schoolUser?.canImportBudgetAllocation!==true;});
})();
