/* Thai fiscal year starts on 1 October; explicit historical selection remains available. */
(()=>{
 const valid=y=>Number.isInteger(Number(y))&&Number(y)>=2500&&Number(y)<=2700;
 function current(now=new Date()){const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Bangkok',calendar:'gregory',year:'numeric',month:'numeric'}).formatToParts(now);const y=Number(parts.find(p=>p.type==='year').value),m=Number(parts.find(p=>p.type==='month').value);return y+543+(m>=10?1:0);}
 function resolve({requested=null,saved=null,anchor=null,now=new Date()}={}){const fiscal=current(now);if(requested!==null&&valid(requested))return Number(requested);if(Number(anchor)===fiscal&&saved!==null&&valid(saved))return Number(saved);return fiscal;}
 const fiscal=current();let saved,anchor;try{saved=sessionStorage.getItem('school-budget-year');anchor=sessionStorage.getItem('school-budget-fiscal-anchor');}catch{}
 const year=resolve({requested:new URL(location.href).searchParams.get('year'),saved,anchor});window.schoolFiscalYear={current,resolve};window.budgetYear=year;
 try{sessionStorage.setItem('school-budget-year',String(year));sessionStorage.setItem('school-budget-fiscal-anchor',String(fiscal));}catch{}
})();
