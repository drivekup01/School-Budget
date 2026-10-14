/* Shared roles: public overview/project summaries; login for ledgers and documents. */
document.documentElement.classList.add('school-auth-loading');
window.schoolAuthReady=(async()=>{
 if(document.readyState==='loading')await new Promise(resolve=>document.addEventListener('DOMContentLoaded',resolve,{once:true}));
 const publicPage=!!document.getElementById('overview')||!!document.getElementById('rows')&&!!document.getElementById('projects');
 const apply=user=>{window.schoolUser=user;document.body.dataset.schoolRole=user.role;document.documentElement.classList.remove('school-auth-loading');document.dispatchEvent(new Event('school-auth-ready'));return user};
 const guest=()=>apply({id:'guest',name:'Guest',role:'guest'});
 const redirect=()=>{const login=new URL('https://drivekup01.github.io/School-Budget/login.html');login.searchParams.set('return',location.href);location.replace(login)};
 const token=sessionStorage.getItem('school-auth-token');if(!token){if(publicPage)return guest();redirect();throw Error('กรุณาเข้าสู่ระบบ')}
 try{if(!window.budgetRpcReady)await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='https://drivekup01.github.io/School-Budget/budget-api.js?v=auth2';script.onload=resolve;script.onerror=()=>reject(Error('เชื่อมต่อระบบเข้าสู่ระบบไม่ได้'));document.head.append(script)});const rpc=await window.budgetRpcReady;const user=await rpc('getBudgetUser',token);window.schoolRpc=(method,...args)=>rpc(method,...args,token);return apply(user)}
 catch(error){sessionStorage.removeItem('school-auth-token');if(publicPage)return guest();redirect();throw error}
})();window.schoolAuthReady.catch(()=>{});
window.schoolLogout=async()=>{const token=sessionStorage.getItem('school-auth-token');sessionStorage.removeItem('school-auth-token');try{if(window.budgetRpcReady){const rpc=await window.budgetRpcReady;await rpc('logoutBudgetUser',token)}}finally{location.assign('https://drivekup01.github.io/School-Budget/budget-dashboard.html')}};
window.schoolLogin=()=>{const login=new URL('https://drivekup01.github.io/School-Budget/login.html');login.searchParams.set('return',location.href);location.assign(login)};
