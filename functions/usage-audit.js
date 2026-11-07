'use strict';
// Canonical implementation. Replicated into each independently deployed codebase.
const {createHash}=require('node:crypto');
const hash=s=>createHash('sha256').update(s).digest('hex');
const fail=(code,message)=>{throw Object.assign(Error(message),{code});};
const labels={resolveProfile:'ตรวจสอบบัญชี',listUsers:'ดูผู้ใช้และสิทธิ์',saveInvitation:'เพิ่มหรือแก้ไขคำเชิญผู้ใช้',updateUser:'แก้ไขสิทธิ์ผู้ใช้',saveDraft:'บันทึกฉบับร่างหน้าแรก',publish:'เผยแพร่หน้าแรก',getDraft:'เปิดข้อมูลแก้ไขหน้าแรก',getPublished:'ดูหน้าแรก',dashboard:'ดูข้อมูลนักเรียน',requestCorrection:'ส่งคำขอแก้ไขข้อมูล',reviewCorrection:'บันทึกผลคำขอแก้ไขข้อมูล',adminClasses:'ดูห้องเรียนสำหรับบัญชีนักเรียน',adminRoster:'ดูรายชื่อนักเรียน',adminRequests:'ดูคำขอแก้ไขข้อมูล',adminEnable:'เปิดบัญชีนักเรียน',adminEnableClass:'เปิดบัญชีนักเรียนทั้งห้อง',adminReset:'รีเซ็ตรหัสผ่านนักเรียน',adminDisable:'ปิดบัญชีนักเรียน',login:'เข้าสู่ระบบนักเรียน',add:'บันทึกคะแนนความประพฤติ',room:'ดูคะแนนความประพฤติของห้อง',classes:'ดูห้องเรียนที่ได้รับสิทธิ์',approve:'อนุมัติคำร้อง',award:'เพิ่มคะแนนตามคำร้อง',submit:'ส่งคำร้อง',create:'สร้างรายการ',update:'แก้ไขรายการ',remove:'ลบรายการ',saveMorningSession:'บันทึกเช็กชื่อเข้าแถว',morningSession:'ดูการเช็กชื่อเข้าแถว',attendanceHome:'ดูภาพรวมดูแลนักเรียน',attendanceSchedule:'ดูตารางสอน',attendanceCatalog:'ดูข้อมูลห้องเรียน',bootstrap:'เปิดข้อมูลตารางสอน',save:'บันทึกข้อมูลตารางสอน',exchangeApprove:'อนุมัติแลกคาบ',saveBudgetDocument:'บันทึกเอกสารงบประมาณ',saveBudgetEntry:'บันทึกรายการงบประมาณ',mutateBudgetEntry:'แก้ไขรายการงบประมาณ',saveBudgetBorrowing:'บันทึกยืมงบประมาณ',cancelBudgetBorrowing:'ยกเลิกยืมงบประมาณ',saveProcurementDocument:'บันทึกเอกสารจัดซื้อจัดจ้าง',getBudgetReferenceData:'ดูข้อมูลอ้างอิงงบประมาณ',setBudgetDocumentsDeleted:'ย้ายหรือคืนเอกสารจากถังขยะ',purgeBudgetDocuments:'ลบเอกสารถาวร'};
const writeMethods=new Set(['replaceRoster', 'adminLink', 'adminUnlink', 'publishBudgetAllocationImport', 'saveInvitation', 'updateUser', 'saveDraft', 'publish', 'requestCorrection', 'reviewCorrection', 'adminEnable', 'adminEnableClass', 'adminReset', 'adminDisable', 'add', 'approve', 'award', 'submit', 'create', 'update', 'delete', 'saveAssignment', 'saveClass', 'saveMarks', 'saveStudent', 'saveMorningSession', 'deleteAnnouncement', 'exchangeCancel', 'exchangeConfirm', 'exchangeSetTerm', 'migrateLegacy', 'refreshLeave', 'saveAnnouncement', 'saveDatabase', 'saveSubstitute', 'setMode', 'cancelBudgetBorrowing', 'cancelInventoryReceipt', 'purgeBudgetDocuments', 'saveBudgetBorrowing', 'saveBudgetDocument', 'saveBudgetEntry', 'mutateBudgetEntry', 'saveBudgetPlanningComment', 'saveInventoryMaterialInfo', 'saveInventoryReceipt', 'saveProcurementDocument', 'saveProcurementDraft', 'setBudgetDocumentsDeleted', 'setInventoryTrashed', 'setProcurementDocumentDeleted', 'updateBudgetFormPosting']);
Object.assign(labels,{replaceRoster:'นำเข้าและปรับปรุงทะเบียนนักเรียน',adminLink:'ผูกบัญชีนักเรียน',adminUnlink:'ยกเลิกผูกบัญชีนักเรียน',publishBudgetAllocationImport:'นำเข้าจัดสรรงบประมาณ',saveAssignment:'บันทึกมอบหมายครูและคาบเรียน',saveClass:'บันทึกห้องเรียน',saveMarks:'บันทึกการมาเรียน',saveStudent:'บันทึกข้อมูลนักเรียน',delete:'ลบข้อมูล',saveDatabase:'บันทึกข้อมูลตารางสอน',saveSubstitute:'บันทึกสอนแทน',saveAnnouncement:'บันทึกประกาศวิชาการ',deleteAnnouncement:'ลบประกาศวิชาการ',exchangeCancel:'ยกเลิกแลกคาบ',exchangeConfirm:'ยืนยันแลกคาบ',exchangeSetTerm:'แก้ไขภาคเรียนแลกคาบ',migrateLegacy:'นำเข้าข้อมูลตารางสอน',refreshLeave:'ปรับปรุงข้อมูลการลา',setMode:'แก้ไขรูปแบบตารางสอน',cancelInventoryReceipt:'ยกเลิกรับพัสดุ',saveInventoryMaterialInfo:'แก้ไขรายละเอียดวัสดุ',saveInventoryReceipt:'บันทึกรับพัสดุ',saveBudgetPlanningComment:'แก้ไขความเห็นแผนงาน',saveProcurementDraft:'บันทึกฉบับร่างจัดซื้อจัดจ้าง',setInventoryTrashed:'เปลี่ยนสถานะถังขยะพัสดุ',setProcurementDocumentDeleted:'เปลี่ยนสถานะเอกสารจัดซื้อจัดจ้าง',updateBudgetFormPosting:'แก้ไขรายการเอกสารงบประมาณ'});
const apiModules={schoolHomepage:'homepage',schoolStudent:'students',schoolStudentLogin:'students',schoolIdentity:'accounts',timetableApi:'academic',budgetApi:'budget',attendanceAdmin:'attendance',attendanceOverview:'attendance',attendanceBehavior:'behavior',attendanceBehaviorRequests:'behavior'};
function moduleFor(path,section=''){
 if(/^(budget|procurement)/.test(section)||/^\/School-(Budget|Procurement)\//.test(path))return 'budget';
 if(/^academic/.test(section)||path.startsWith('/School-OS/'))return 'academic';
 if(/behavior/.test(section)||/behavior/.test(path))return 'behavior';
 if(/^student-(home|morning|subject|reports|admin)/.test(section)||/\/attendance\//.test(path)||path.startsWith('/School-Attendance/'))return 'attendance';
 if(section==='homepage'||/\/admin\/homepage/.test(path))return 'homepage';
 if(section==='student-accounts'||/\/student[s\/.]/.test(path))return 'students';
 if(section==='accounts'||/users\.html/.test(path))return 'accounts';
 if(/\/admin\//.test(path))return 'admin';return 'portal';
}
function validateBrowser(input){
 if(!input||Object.keys(input).some(k=>!['method','kind','eventId','path','section'].includes(k))||!['login','session','logout'].includes(input.kind)||typeof input.eventId!=='string'||!(/^[a-zA-Z0-9_-]{16,100}$/).test(input.eventId))fail('invalid-argument','รายการประวัติไม่ถูกต้อง');
 if(typeof input.path!=='string'||input.path.length>250||!/^\/School-(Portal|Budget|Procurement|OS|Attendance)\/[A-Za-z0-9_./-]*$/.test(input.path)||input.path.includes('..')||typeof input.section!=='string'||!/^[a-zA-Z0-9_-]{0,80}$/.test(input.section))fail('invalid-argument','ส่วนที่ใช้งานไม่ถูกต้อง');
}
function service(db,stamp,clock=()=>Date.now()){
 async function subject(request,{allowInactive=false,studentCode}={}){
  const a=request.auth,code=studentCode||a?.token?.studentCode;
  if(studentCode||a?.token?.studentLogin===true&&a?.token?.firebase?.sign_in_provider==='custom'){
   if(!/^\d{1,20}$/.test(code||'')||!studentCode&&a.uid!=='student_'+hash(code))fail('unauthenticated','กรุณาเข้าสู่ระบบ');
   const account=(await db.doc('school_student_passwords/'+hash(code)).get()).data();
   if(!account?.active||!studentCode&&account.version!==a.token.studentSession)fail('permission-denied','บัญชีนักเรียนเปลี่ยนแปลง');
   const student=(await db.doc('attendance_classes/'+account.classId+'/students/'+account.studentId).get()).data();
   if(!student||student.active===false)fail('permission-denied','บัญชีนักเรียนไม่พร้อม');
   return {uid:'student_'+hash(code),name:String(student.name||'นักเรียน').slice(0,200),email:'',role:'student'};
  }
  if(!a?.uid||a.token?.email_verified!==true||a.token?.firebase?.sign_in_provider!=='google.com')fail('unauthenticated','กรุณาเข้าสู่ระบบด้วยบัญชีโรงเรียน');
  const p=(await db.doc('school_users/'+a.uid).get()).data();
  if(!p||!allowInactive&&p.active!==true)fail('permission-denied','บัญชีนี้ไม่ได้เปิดใช้งาน');
  return {uid:a.uid,name:String(p.name||a.token.name||'ผู้ใช้').slice(0,200),email:String(a.token.email||'').slice(0,254),role:p.schoolRole|| (p.identityAdmin?'admin':'teacher'),admin:p.active===true&&(p.schoolRole?p.schoolRole==='admin':p.identityAdmin===true)};
 }
 const safeActor=p=>({uid:p.uid,name:p.name,email:p.email,role:p.role});
 async function track(api,request,work){
  let result,outcome='success';
  try{result=await work();return result;}catch(error){outcome='failed';throw error;}
  finally{
   try{
    const method=request.data?.method;if(apiModules[api]&&(writeMethods.has(method)||api==='schoolStudentLogin'&&method==='login')&&(request.auth||api==='schoolStudentLogin'&&method==='login'&&outcome==='success')){
     const actor=await subject(request,{allowInactive:true,...(!request.auth&&api==='schoolStudentLogin'?{studentCode:request.data.code}:{})});
     const details={...safeActor(actor),kind:api==='schoolStudentLogin'&&method==='login'?'login':'action',source:'server',outcome,module:api==='schoolIdentity'&&/morning|attendance/i.test(method)?'attendance':apiModules[api],action:labels[method]||'ดำเนินการ '+method,api,method,path:'',section:'',createdAt:stamp()};
     await db.collection('school_usage_events').doc().create(details);
    }
   }catch(error){console.error('Usage audit unavailable',String(error.code||'unknown'));}
  }
 }
 async function record(request){
  const input=request.data;validateBrowser(input);const actor=await subject(request),ref=db.doc('school_usage_events/'+hash(actor.uid+':'+input.eventId)),limit=db.doc('school_usage_limits/'+hash(actor.uid));
  await db.runTransaction(async tx=>{
   const [prior,counter]=await Promise.all([tx.get(ref),tx.get(limit)]);if(prior.exists)return;
   const old=counter.data(),minute=Math.floor(clock()/60000),count=old?.minute===minute?old.count:0;
   if(count>=120)fail('resource-exhausted','บันทึกถี่เกินไป');
   tx.set(limit,{minute,count:count+1});
   tx.create(ref,{...safeActor(actor),kind:input.kind,source:'browser',outcome:'reported',module:moduleFor(input.path,input.section),action:{login:'เข้าสู่ระบบ',session:'เริ่มใช้งานบัญชีที่เข้าสู่ระบบอยู่',logout:'ออกจากระบบ',visit:'เปิดส่วนการใช้งาน'}[input.kind],path:input.path,section:input.section,createdAt:stamp()});
  });return {ok:true};
 }
 async function list(request){
  const actor=await subject(request);if(!actor.admin)fail('permission-denied','ประวัติรวมสำหรับผู้ดูแลระบบเท่านั้น');
  const input=request.data;if(Object.keys(input).some(k=>!['method','cursor','from','to'].includes(k)))fail('invalid-argument','คำขอไม่ถูกต้อง');
  let query=db.collection('school_usage_events').orderBy('createdAt','desc');
  for(const key of ['from','to'])if(input[key]){const date=input[key];if(typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date)fail('invalid-argument','วันที่ไม่ถูกต้อง');query=query.where('createdAt',key==='from'?'>=':'<=',new Date(date+(key==='from'?'T00:00:00+07:00':'T23:59:59.999+07:00')));}
  if(input.from&&input.to&&input.from>input.to)fail('invalid-argument','ช่วงวันที่ไม่ถูกต้อง');
  if(input.cursor){if(typeof input.cursor!=='string'||!/^[a-zA-Z0-9_-]{1,128}$/.test(input.cursor))fail('invalid-argument','ตำแหน่งรายการไม่ถูกต้อง');const prior=await db.doc('school_usage_events/'+input.cursor).get();if(!prior.exists)fail('invalid-argument','ไม่พบตำแหน่งรายการ');query=query.startAfter(prior);}
  const snap=await query.limit(101).get(),docs=snap.docs.slice(0,100);
  return {events:docs.filter(d=>d.data().kind!=='action'||writeMethods.has(d.data().method)).map(d=>{const v=d.data();return {id:d.id,uid:v.uid,name:v.name,email:v.email,role:v.role,module:v.module,kind:v.kind,source:v.source,outcome:v.outcome,action:v.action,api:v.api||'',method:v.method||'',path:v.path||'',section:v.section||'',createdAt:v.createdAt?.toDate?.().toISOString()||''};}),cursor:snap.docs.length>100?docs.at(-1).id:null};
 }
 return {track,subject,record,list,async handle(request){if(request.data?.method==='record')return record(request);if(request.data?.method==='list')return list(request);fail('invalid-argument','คำขอไม่ถูกต้อง');}};
}
module.exports={service,validateBrowser,moduleFor,labels,writeMethods};
