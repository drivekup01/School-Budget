(() => {
 const select=document.getElementById('budgetYear');if(!select)return;
 const year=new URL(location.href).searchParams.get('year')==='2570'?2570:2569;
 window.budgetYear=year;window.budgetYearDataUrl=year===2570?'budget-data-2570.json':'budget-data.json';select.value=String(year);
 const empty=year===2570;document.getElementById('yearEmpty').hidden=!empty;
 document.querySelector('#overview footer').hidden=empty;document.getElementById('projectPageHelp').hidden=empty;
 document.querySelector('.charts').hidden=empty;document.getElementById('balanceSummary').hidden=empty;
 select.addEventListener('change',()=>{const url=new URL(location.href);url.searchParams.set('year',select.value);location.assign(url.href)});
})();
