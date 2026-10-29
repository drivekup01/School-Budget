/* Shared navigation for all budget department pages. */
(() => {
 document.body.classList.toggle('budget-embedded',window.self!==window.top);
 document.getElementById('budgetSidebar')?.remove();
 const sidebar=document.createElement('aside');sidebar.id='budgetSidebar';
 const pageLink=page=>page==='history.html'?(window.schoolAppPageLinks?.[page]||'https://drivekup01.github.io/School-Procurement/history.html?v=20261015-guest2'):'https://drivekup01.github.io/School-Budget/'+page+'?v=20261015-guestforms1&year='+(window.budgetYear|| (Number(new URL(location.href).searchParams.get('year'))||2569));
 const brand=document.createElement('a');brand.className='budget-sidebar-brand';brand.href='https://drivekup01.github.io/School-Portal/';brand.target='_top';
 brand.innerHTML='<img src="https://drivekup01.github.io/School-Budget/school-logo.svg" alt="ตราโรงเรียน"><span>โรงเรียนค่ายบางระจันวิทยาคม<small>ระบบงานงบประมาณ</small></span>';sidebar.append(brand);
 const accountNames={'drivekup1':'ผู้ดูแลระบบ','teanpak.su':'ฝ่ายงบประมาณ','editor1':'ฝ่ายจัดซื้อ / จัดจ้าง'};
 const nav=document.createElement('nav');nav.setAttribute('aria-label','เมนูระบบงบประมาณ');
 const view=document.body.dataset.documentView||document.body.dataset.budgetPage||'budget';const current=view==='editor'?'history':view;
 for(const [name,page,key] of [['◈ ภาพรวมงบประมาณ','budget-dashboard.html','budget'],['▤ โครงการและกิจกรรม','budget-projects.html','projects'],['▥ รายงานงบประมาณ','budget-reports.html','reports'],['▧ เอกสารงบ 1 และ งบ 2','budget-documents.html','budget-documents'],['▣ เอกสารเบิกจ่าย','disbursement.html','disbursement'],['≡ เอกสารจัดซื้อ / จัดจ้าง','history.html#history','history'],['⇧ นำเข้าฐานข้อมูล','budget-import.html','import'],['← หน้าหลักโรงเรียน','https://drivekup01.github.io/School-Portal/','home']]){
  const link=document.createElement('a');link.textContent=name;const [file,hash]=page.split('#');link.href=page.startsWith('https:')?page:pageLink(file)+(hash?'#'+hash:'');link.target='_top';link.dataset.view=key;if(!['budget','projects','home'].includes(key)){link.hidden=true;link.style.display='none';}if(key===current){link.className='active';link.setAttribute('aria-current','page')}nav.append(link);
 }sidebar.append(nav);
 document.body.prepend(sidebar);document.body.classList.add('has-budget-sidebar');mountSchoolHomeButton(sidebar);
 window.schoolAuthReady?.then(user=>{const staff=['admin','editor','viewer','procurement'].includes(user.role);for(const link of nav.querySelectorAll('a')){const key=link.dataset.view,visible=['budget','projects','home'].includes(key)||(staff&&key!=='import');link.hidden=!visible;link.style.display=visible?'':'none';}const importLink=nav.querySelector('[data-view="import"]');importLink.hidden=!(user.id==='teanpak.su'&&user.role==='admin');importLink.style.display=importLink.hidden?'none':'';const account=document.createElement('div');account.className='school-account';const heading=document.createElement('small');heading.className='school-account-heading';heading.textContent='เข้าสู่ระบบ';const identity=document.createElement('div');identity.className='school-account-identity';const icon=document.createElement('span');icon.className='school-account-icon';icon.setAttribute('aria-hidden','true');icon.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/></svg>';const name=document.createElement('strong');name.textContent=user.role==='guest'?'Guest':(accountNames[user.id]||user.name);if(user.displayName)name.textContent=user.displayName;const identityText=document.createElement('span');identityText.style.minWidth='0';identityText.append(name);if(user.realName){const realName=document.createElement('small');realName.textContent=user.realName;realName.style.cssText='display:block;font-size:12px;margin-top:5px;line-height:1.5;white-space:normal';identityText.append(realName)}identity.append(icon,identityText);const button=document.createElement('button');button.type='button';button.textContent=user.role==='guest'?'เข้าสู่ระบบ':'ออกจากระบบ';button.addEventListener('click',user.role==='guest'?window.schoolLogin:window.schoolLogout);account.append(identity,button);sidebar.append(account)});const manager=document.getElementById('documentManager');if(manager)new MutationObserver(()=>{const view='history';nav.querySelectorAll('a').forEach(a=>{const active=a.dataset.view===view;a.classList.toggle('active',active);if(active)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current')})}).observe(manager,{attributes:true,attributeFilter:['hidden']});
})();

/* A local clock: no network requests and no effect on financial data loading. */
(() => {
 const brand=document.querySelector('#budgetSidebar .budget-sidebar-brand');if(!brand||document.getElementById('budgetClock'))return;
 const bar=document.createElement('div');bar.className='budget-clock-bar';
 const clock=document.createElement('div');clock.id='budgetClock';clock.className='budget-clock';clock.setAttribute('role','group');clock.setAttribute('aria-label','วันที่และเวลาปัจจุบัน ประเทศไทย');
 const content=document.createElement('div'),date=document.createElement('span'),time=document.createElement('time');date.className='budget-clock-date';time.className='budget-clock-time';content.append(date,time);clock.append(content);bar.append(clock);brand.after(bar);
 const dayFormat=new Intl.DateTimeFormat('th-TH-u-ca-buddhist-nu-latn',{timeZone:'Asia/Bangkok',weekday:'long',day:'numeric',month:'long',year:'numeric'});
 const timeFormat=new Intl.DateTimeFormat('th-TH-u-nu-latn',{timeZone:'Asia/Bangkok',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
 function tick(){const now=new Date(),parts=Object.fromEntries(dayFormat.formatToParts(now).map(p=>[p.type,p.value]));const label=parts.weekday+'ที่ '+parts.day+' '+parts.month+' พ.ศ. '+parts.year;if(date.textContent!==label)date.textContent=label;time.dateTime=now.toISOString();time.textContent='เวลา '+timeFormat.format(now)+' น. · เวลาไทย';}
 tick();setInterval(()=>{if(!document.hidden)tick();},1000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)tick();});window.addEventListener('pageshow',tick);
})();

function mountSchoolHomeButton(sidebar){
 if(!sidebar)return;
 sidebar.querySelectorAll('a.back-school,a[data-view="home"]').forEach(a=>a.remove());
 document.querySelectorAll('.school-portal-link').forEach(a=>a.remove());
 const area=document.createElement('div');area.className='school-home-area';
 const link=document.createElement('a');link.className='school-home-button';link.href='https://drivekup01.github.io/School-Portal/';link.target='_top';link.innerHTML='<span aria-hidden="true">←</span><span>หน้าหลักโรงเรียน</span>';link.setAttribute('aria-label','กลับหน้าหลักโรงเรียน');area.append(link);
 const bottom=sidebar.querySelector('.sidebar-bottom');if(bottom)bottom.prepend(area);else sidebar.append(area);
 const style=document.createElement('style');style.textContent=`
 .school-home-area{margin-top:auto;padding:16px 12px;flex-shrink:0;box-sizing:border-box}
 .sidebar-bottom>.school-home-area{margin:0;padding:0 0 16px}
 a.school-home-button{display:flex!important;align-items:center;justify-content:flex-start;gap:10px;box-sizing:border-box;min-height:44px;width:100%;padding:11px 14px!important;border:1px solid #ffffff30!important;border-radius:10px!important;background:#ffffff0c!important;color:#f0e5fa!important;font:13px/1.5 "IBM Plex Sans Thai",Tahoma,sans-serif!important;text-decoration:none!important;white-space:nowrap}
 a.school-home-button:hover{background:#ffffff20!important}a.school-home-button:focus-visible{outline:3px solid #cda4ed;outline-offset:3px}
 #budgetSidebar>.school-account{margin-top:0!important}.sidebar-collapsed .school-home-area{padding:10px 7px}.sidebar-collapsed .school-home-button{padding:10px!important;justify-content:center}.sidebar-collapsed .school-home-button span+span{display:none}
 @media(max-width:820px){body>.school-home-area{position:fixed;left:14px;bottom:84px;width:190px;z-index:45;padding:0}body>.school-home-area a.school-home-button{background:#472468!important;box-shadow:0 4px 14px #29174325}}
 @media print{.school-home-area{display:none!important}}`;
 document.head.append(style);
 const media=matchMedia('(max-width:820px)');function position(){if(media.matches)document.body.append(area);else if(bottom)bottom.prepend(area);else sidebar.insertBefore(area,sidebar.querySelector(':scope>.school-account'));}position();media.addEventListener('change',position);
}
