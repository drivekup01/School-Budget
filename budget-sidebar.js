/* Shared navigation for all budget department pages. */
(() => {
 document.getElementById('budgetSidebar')?.remove();
 const sidebar=document.createElement('aside');sidebar.id='budgetSidebar';
 const pageLink=page=>page==='history.html'?(window.schoolAppPageLinks?.[page]||'https://drivekup01.github.io/School-Procurement/history.html'):'https://drivekup01.github.io/School-Budget/'+page;
 const brand=document.createElement('a');brand.className='budget-sidebar-brand';brand.href='https://drivekup01.github.io/School-Portal/';brand.target='_top';
 brand.innerHTML='<img src="https://drivekup01.github.io/School-Budget/school-logo.svg" alt="ตราโรงเรียน"><span>โรงเรียนค่ายบางระจันวิทยาคม<small>ระบบงานงบประมาณ</small></span>';sidebar.append(brand);
 const nav=document.createElement('nav');nav.setAttribute('aria-label','เมนูระบบงบประมาณ');
 const view=document.body.dataset.documentView||document.body.dataset.budgetPage||'budget';const current=view==='editor'?'history':view;
 for(const [name,page,key] of [['◈ ภาพรวมงบประมาณ','budget-dashboard.html','budget'],['▤ โครงการและกิจกรรม','budget-projects.html','projects'],['≡ เอกสารจัดซื้อ / จัดจ้าง','history.html#history','history'],['← หน้าหลักโรงเรียน','https://drivekup01.github.io/School-Portal/','home']]){
  const link=document.createElement('a');link.textContent=name;const [file,hash]=page.split('#');link.href=page.startsWith('https:')?page:pageLink(file)+(hash?'#'+hash:'');link.target='_top';link.dataset.view=key;if(key===current){link.className='active';link.setAttribute('aria-current','page')}nav.append(link);
 }sidebar.append(nav);
 const note=document.createElement('div');note.className='budget-sidebar-note';note.innerHTML='งานบริหารงบประมาณ<small>โรงเรียนค่ายบางระจันวิทยาคม</small>';sidebar.append(note);document.body.prepend(sidebar);document.body.classList.add('has-budget-sidebar');
 window.schoolAuthReady?.then(user=>{const account=document.createElement('div');account.className='school-account';const name=document.createElement('span');name.textContent=user.name+' · '+(user.role==='admin'?'ผู้ดูแลระบบ':'ผู้จัดทำเอกสาร');const logout=document.createElement('button');logout.type='button';logout.textContent='ออกจากระบบ';logout.addEventListener('click',window.schoolLogout);account.append(name,logout);sidebar.append(account)});const manager=document.getElementById('documentManager');if(manager)new MutationObserver(()=>{const view='history';nav.querySelectorAll('a').forEach(a=>{const active=a.dataset.view===view;a.classList.toggle('active',active);if(active)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current')})}).observe(manager,{attributes:true,attributeFilter:['hidden']});
})();
