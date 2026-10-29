/* Presentation only: move existing controls without duplicating document values. */
window.setupBudgetDocumentSections=function(onSelect){
 const form=document.getElementById('budgetDocumentForm'),fields=document.getElementById('documentFields');
 if(!form||!fields)return;
 const commonNodes=[],itemNodes=[];let past=false;
 for(const node of Array.from(form.children)){if(node===fields){past=true;continue}(past?itemNodes:commonNodes).push(node)}
 function section(title,key,open){const box=document.createElement('details');box.className='budget-form-section';box.dataset.section=key;const summary=document.createElement('summary');summary.textContent=title;box.append(summary);let saved;try{saved=sessionStorage.getItem('budget-forms-section-'+key)}catch{}box.open=saved===null||saved===undefined?open:saved==='open';box.addEventListener('toggle',()=>{try{sessionStorage.setItem('budget-forms-section-'+key,box.open?'open':'closed')}catch{}});const body=document.createElement('div');body.className='budget-form-section-body';box.append(body);return {box,body}}
 const root=document.createElement('div'),tabs=document.createElement('div');tabs.className='document-page-tabs';tabs.setAttribute('aria-label','เลือกหน้าเอกสารที่ต้องการกรอก');
 for(const [key,label]of [['one','งบ 1'],['two','งบ 2']]){const b=document.createElement('button');b.type='button';b.dataset.editorPage=key;b.textContent=label;tabs.append(b)}root.append(tabs);
 const common=section('ข้อมูลโครงการและงบประมาณ','common',true);commonNodes.forEach(n=>{if(n.tagName!=='H2')common.body.append(n)});root.append(common.box);
 const head1=section('หัวกระดาษ · งบ 1','header-one',true),head2=section('หัวกระดาษ · งบ 2','header-two',true),body1=section('ข้อมูลตรงกลาง · งบ 1','body-one',true),body2=section('ข้อมูลตรงกลาง · งบ 2','body-two',true),sign=section('ผู้รับผิดชอบและผู้ลงนาม','signatures',false);
 const page1=document.createElement('div'),page2=document.createElement('div');page1.dataset.budgetEditorPage='one';page2.dataset.budgetEditorPage='two';page1.append(head1.box,body1.box);page2.append(head2.box,body2.box);root.append(page1,page2,sign.box);
 function move(keys,parent){for(const key of keys){const label=document.getElementById('doc-'+key)?.closest('label');if(label)parent.append(label)}}
 const optionalNote=document.createElement('p');optionalNote.className='forms-note';optionalNote.textContent='ข้อมูลส่วนนี้กรอกเฉพาะที่เกี่ยวข้อง เว้นว่างได้ โดยยังบันทึกและพิมพ์เอกสารได้';body2.body.append(optionalNote);
 move(['number1','date1'],head1.body);move(['number2','date2'],head2.body);move(['kind','purpose','expense','orderNumber','inspectionDate','advancePayer'],body2.body);
 body2.body.append(document.getElementById('budgetDocumentFunding'));
 const note=document.createElement('p');note.className='forms-note';note.textContent='ฝ่าย โครงการ กิจกรรม ยอดเงิน และยอดเบิกครั้งนี้ ใช้ข้อมูลจากส่วนที่ใช้ร่วมกันด้านบน';body1.body.append(note);itemNodes.forEach(n=>body1.body.append(n));
 move(['activityOwner','projectOwner','departmentHead','deputy','planning','procurement','budget','director'],sign.body);
 const opinions=section('ความเห็นของผู้ลงนาม (เว้นว่างเพื่อลงนามบนกระดาษได้)','opinions',false);Array.from(fields.querySelectorAll(':scope > label')).forEach(n=>opinions.body.append(n));sign.body.append(opinions.box);
 form.replaceChildren(root);
 let current='one';try{if(sessionStorage.getItem('budget-forms-active-page')==='two')current='two'}catch{}
 function select(page){current=page==='two'?'two':'one';page1.hidden=current!=='one';page2.hidden=current!=='two';document.querySelectorAll('[data-editor-page],[data-preview]').forEach(b=>{const active=(b.dataset.editorPage||b.dataset.preview)===current;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active))});try{sessionStorage.setItem('budget-forms-active-page',current)}catch{}onSelect(current)}
 tabs.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>select(b.dataset.editorPage)));
 window.budgetDocumentSections={select,get current(){return current},reveal(key){const input=document.getElementById('doc-'+key);const group=input?.closest('[data-budget-editor-page]');if(group)select(group.dataset.budgetEditorPage);for(let parent=input?.parentElement;parent;parent=parent.parentElement)if(parent.tagName==='DETAILS')parent.open=true;input?.focus()}};select(current);
};
