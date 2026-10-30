/* Firebase-only adapter; legacy Apps Script adapter remains for the separate procurement app. */
window.budgetFirebaseReady=import('./js/budget-firebase-client.js?v=20261030-project14');
Object.defineProperty(window,'budgetRpcReady',{configurable:true,get(){return window.budgetFirebaseReady.then(client=>async(method,...args)=>{if(method==='getBudgetYears')return client.years();if(method==='getBudgetYearSnapshot')return client.readYear(Number(args[0]),!!args[1]);if(method==='getBudgetAdjustmentSummary')return {year:Number(args[0]),projects:{}};return client.rpc(method,...args)})}});
window.fetchBudgetYearData=async(year,options={})=>(await window.budgetFirebaseReady).readYear(Number(year),!!(options.force||options.refresh));
window.rememberBudgetProject=async()=>{};
