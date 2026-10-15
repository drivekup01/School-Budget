/* Read-only source registers, kept separate from allocation summaries. */
(() => {
 const money=n=>n===null?'—':n.toLocaleString('th-TH',{minimumFractionDigits:2,maximumFractionDigits:2});
 let registers=[];const rows=document.getElementById('rows');
 function attach(){for(const register of registers){const target=document.querySelector('#details-'+register.projectId+' td');if(!target||target.querySelector('.source-register'))continue;
  const section=document.createElement('section');section.className='source-register';const heading=document.createElement('h3');heading.textContent='ทะเบียนใช้เงินรายโครงการ';section.append(heading);
  const note=document.createElement('p');note.className='detail-warning';note.textContent='แสดงตามต้นฉบับ แยกชุดบัญชี ไม่รวมยอดซ้ำ: เงินยืมและรายการเคลียร์เงินยืมต้องตรวจสอบก่อนรวมยอด วันที่ในต้นฉบับยังต้องยืนยันปี';section.append(note);
  if(!register.blocks.some(b=>b.rows.length)){const p=document.createElement('p');p.textContent='ยังไม่มีรายการใช้เงินในแท็บโครงการนี้';section.append(p)}
  register.blocks.filter(b=>b.rows.length).forEach((block,i)=>{const h=document.createElement('h4');h.textContent='ชุดทะเบียน '+(i+1)+' · แถวหัวตาราง '+block.headerRow;section.append(h);const wrap=document.createElement('div');wrap.className='table-wrap';const table=document.createElement('table');table.innerHTML='<thead><tr><th>แถว / เลขที่</th><th>รายการ</th><th>รับจัดสรร / รับเพิ่ม</th><th>จำนวนเงินที่ใช้</th><th>คงเหลือตาม Sheet</th><th>หมายเหตุ</th></tr></thead>';const body=document.createElement('tbody');for(const item of block.rows){const tr=document.createElement('tr');for(const value of [item.row+' / '+(item.number||'—'),item.description,money(item.allocated),money(item.spent),money(item.remaining),item.note||'—']){const td=document.createElement('td');td.textContent=value;tr.append(td)}body.append(tr)}table.append(body);wrap.append(table);section.append(wrap)});target.append(section);
 }}
 new MutationObserver(attach).observe(rows,{childList:true});fetch('budget-data.json',{cache:'default'}).then(r=>{if(!r.ok)throw Error();return r.json()}).then(data=>{registers=data.registers||[];attach()}).catch(()=>{const p=document.createElement('p');p.setAttribute('role','alert');p.textContent='โหลดทะเบียนใช้เงินไม่สำเร็จ กรุณาลองใหม่';rows.closest('section').append(p)});
})();
