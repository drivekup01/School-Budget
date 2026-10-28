/* Authentication grants no permissions until a matching approved budget_users profile exists. */
document.documentElement.classList.add('school-auth-loading');
window.budgetFirebaseReady||=import('./js/budget-firebase-client.js?v=20261028-teacherforms2');
window.schoolLogin=()=>{const url=new URL('https://drivekup01.github.io/School-Budget/budget-login.html');url.searchParams.set('return',location.href);location.assign(url)};
window.schoolLogout=async()=>{await(await window.budgetFirebaseReady).logout();location.assign('budget-dashboard.html')};
window.schoolAuthReady=(async()=>{
 if(document.readyState==='loading')await new Promise(r=>document.addEventListener('DOMContentLoaded',r,{once:true}));
 const publicPage=!!document.querySelector('#overview,#projects');
 if(publicPage){document.body.dataset.schoolRole='guest';document.documentElement.classList.remove('school-auth-loading')}
 try{const client=await window.budgetFirebaseReady,user=await client.profile();window.schoolUser=user;window.schoolRpc=(method,...args)=>client.rpc(method,...args);document.body.dataset.schoolRole=user.role;
 if(user.role==='guest'&&!publicPage){window.schoolLogin();throw Error('กรุณาเข้าสู่ระบบ')}
 document.dispatchEvent(new Event('school-auth-ready'));return user;
 }catch(error){const banner=document.createElement('p');banner.className='error';banner.setAttribute('role','alert');banner.textContent=error.message;document.querySelector('main')?.prepend(banner);if(publicPage){const user={id:'guest',role:'guest',name:'Guest',canWriteBudget:false};window.schoolUser=user;return user}throw error;
 }finally{document.documentElement.classList.remove('school-auth-loading')}
})();window.schoolAuthReady.catch(()=>{});
