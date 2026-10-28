/* Document-only compatibility adapter. No financial mutations are available here. */
window.budgetDocumentLedger=(()=>{
 const norm=s=>String(s||'').replace(/\s+/g,'');
 function block(state,d){const funds=state.blocks.filter(b=>b.budgetType===d.fund),exact=funds.filter(b=>norm(b.activity)===norm(d.activity)),matches=exact.length?exact:funds.filter(b=>!b.activity);if(matches.length!==1)throw Error('ไม่พบทะเบียนกิจกรรมเดียวกัน');return matches[0];}
 function disabled(){throw Error('งบ 1 / งบ 2 เป็นเอกสารเท่านั้น กรุณาบันทึกงบจริงที่โครงการ / กิจกรรม');}
 return {block,prepare:disabled,post:disabled,update:disabled};
})();
