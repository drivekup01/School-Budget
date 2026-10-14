(() => {
 const select=document.getElementById('budgetYear');if(!select)return;
 const year=new URL(location.href).searchParams.get('year')==='2570'?2570:2569;
 window.budgetYear=year;window.budgetYearDataUrl=year===2570?'budget-data-2570.json':'budget-data.json';select.value=String(year);
 const empty=year===2570;document.getElementById('yearEmpty').hidden=!empty;
 document.querySelector('#overview footer').hidden=empty;document.getElementById('projectPageHelp').hidden=empty;
 document.querySelector('.charts').hidden=empty;document.getElementById('balanceSummary').hidden=empty;
 select.addEventListener('change',()=>{const url=new URL(location.href);url.searchParams.set('year',select.value);location.assign(url.href)});
 const menu=document.createElement('details');menu.className='year-menu';
 menu.innerHTML=`<summary aria-label="เลือกปีงบประมาณ ปัจจุบัน ${year}"><span class="year-calendar" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4M17 3v4M3 11h18M7 15h3M14 15h3M7 18h3"/></svg></span><span class="year-button-label"><small>ปีงบประมาณ</small><strong>${year}</strong></span><span class="year-chevron" aria-hidden="true">⌄</span></summary><div class="year-options" aria-label="ปีงบประมาณที่เลือกได้">${[2569,2570].map(y=>`<button type="button" class="year-option" data-year="${y}" aria-pressed="${y===year}"><span><small>ปีงบประมาณ</small><strong>${y}</strong></span><i class="year-check" aria-hidden="true">${y===year?'✓':''}</i></button>`).join('')}</div>`;
 select.hidden=true;select.parentElement.append(menu);
 menu.addEventListener('click',e=>{const option=e.target.closest('[data-year]');if(!option)return;select.value=option.dataset.year;select.dispatchEvent(new Event('change'))});
 document.addEventListener('click',e=>{if(!menu.contains(e.target))menu.open=false});
 menu.addEventListener('keydown',e=>{if(e.key==='Escape'){menu.open=false;menu.querySelector('summary').focus();e.preventDefault()}if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();menu.open=true;const buttons=[...menu.querySelectorAll('button')],index=buttons.indexOf(document.activeElement);buttons[(index+(e.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length].focus()}});
})();
