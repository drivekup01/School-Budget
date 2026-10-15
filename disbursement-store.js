/* Monthly wage documents only. No financial ledger writes. */
window.disbursementStore=(()=>{
 const key='school-monthly-disbursement-history-v1';
 function access(){if(!['admin','editor'].includes(window.schoolUser?.role))throw Error('กรุณาเข้าสู่ระบบเพื่อใช้เอกสารเบิกจ่าย')}
 return {list(){access();const rows=JSON.parse(localStorage.getItem(key)||'[]');if(!Array.isArray(rows))throw Error('อ่านประวัติเอกสารไม่ได้');return rows},get(id){return this.list().find(d=>d.id===id)},save(data){access();const rows=this.list(),entry=JSON.parse(JSON.stringify({...data,id:data.id||crypto.randomUUID(),savedAt:new Date().toISOString(),savedBy:window.schoolUser.id})),index=rows.findIndex(d=>d.id===entry.id);if(index<0)rows.unshift(entry);else rows[index]=entry;localStorage.setItem(key,JSON.stringify(rows));return entry}};
})();
