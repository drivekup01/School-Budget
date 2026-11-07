'use strict';
// Shared policy. Copies in the three Functions codebases must stay identical.
const labels={admin:'ผู้ดูแลระบบ',director:'ผู้อำนวยการ',deputy:'รองผู้อำนวยการ',teacher:'ครู / บุคลากร',timetable:'ฝ่ายวิชาการ',budget:'ฝ่ายงบประมาณ',procurement:'ฝ่ายพัสดุ',student_support:'ฝ่ายดูแลนักเรียน'};
function grants(role){
 if(!Object.hasOwn(labels,role))throw Object.assign(Error('บทบาทไม่ถูกต้อง'),{code:'invalid-argument'});
 const admin=role==='admin',teaching=!['director','deputy'].includes(role);
 return {schoolRole:role,identityAdmin:admin,timetableRole:['admin','timetable'].includes(role)?'academic':'viewer',attendanceRole:admin?'admin':teaching?'teacher':'viewer',budgetRole:admin?'admin':['budget'].includes(role)?'editor':role==='procurement'?'procurement':'viewer'};
}
function capabilities(profile){
 if(!profile||!Object.hasOwn(profile,'schoolRole'))return null; // Legacy profiles migrate explicitly.
 const role=profile.schoolRole,active=profile.active===true&&Object.hasOwn(labels,role),admin=active&&role==='admin';
 return {active,admin,readAll:active,markAttendance:active&&!['director','deputy'].includes(role),editTimetable:active&&['admin','timetable'].includes(role),editBudget:active&&['admin','budget'].includes(role),editDocuments:active,submitRequests:active&&!['director','deputy'].includes(role),manageRequests:admin,approveRequests:active&&['admin','director'].includes(role),editAnyRequest:admin,directPoints:active&&['admin','student_support'].includes(role)};
}
module.exports={labels,grants,capabilities};
