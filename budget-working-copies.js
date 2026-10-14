/* Open the editable native working copy at the selected project's tab. */
(() => {
 const rows=document.getElementById('rows');if(!rows)return;let sheets=[];
 function attach(){for(const project of sheets){const button=rows.querySelector(`button[data-id="${project.projectId}"]`);if(!button||button.parentElement.querySelector('.working-copy-link'))continue;const link=document.createElement('a');link.className='working-copy-link';link.href=project.url;link.target='_blank';link.rel='noopener';link.textContent='เพิ่ม / แก้ไขทะเบียนในสำเนา Sheet ↗';button.parentElement.append(link)}}
 new MutationObserver(attach).observe(rows,{childList:true});fetch('budget-workbooks.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error();return r.json()}).then(data=>{sheets=data.departments.flatMap(d=>d.projectSheets);attach()}).catch(()=>{const message=document.createElement('p');message.className='table-help';message.textContent='โหลดลิงก์สำเนาไม่สำเร็จ กรุณาลองใหม่';rows.closest('section').append(message)});
})();
