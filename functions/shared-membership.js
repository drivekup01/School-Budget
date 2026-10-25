'use strict';
function deny(message,code='permission-denied'){throw Object.assign(new Error(message),{code});}
async function member(db,a){
 if(!a||a.token.email_verified!==true||a.token.firebase?.sign_in_provider!=='google.com')deny('กรุณาเข้าสู่ระบบด้วย Google','unauthenticated');
 const center=await db.doc('school_users/'+a.uid).get();
 if(center.exists){const p=center.data();if(!p.active||!['admin','editor'].includes(p.budgetRole))deny('บัญชีนี้ยังไม่ได้รับสิทธิ์ระบบงบประมาณ');const old=await db.doc('budget_users/'+a.uid).get();return {...old.data(),...p,id:a.uid,role:p.budgetRole,name:p.name,canWriteBudget:true};}
 const snap=await db.doc('budget_users/'+a.uid).get(),p=snap.data();if(!p||!p.active||p.email!==a.token.email||!['admin','editor'].includes(p.role))deny('บัญชีนี้ยังไม่ได้รับสิทธิ์ระบบงบประมาณ');return {...p,id:a.uid};
}
module.exports={member};
