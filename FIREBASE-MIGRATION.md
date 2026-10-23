# ระบบงบประมาณบน Firebase

ระบบงบประมาณใช้ Cloud Firestore ในโปรเจกต์ `school-budget-3e69d` ฐาน `(default)` ภูมิภาค `asia-southeast1` ตั้งแต่ 23 ตุลาคม 2569

- คนทั่วไปอ่านยอดสรุปและโครงการได้โดยไม่เข้าสู่ระบบ ไม่มีรายการบัญชีหรืออีเมลอยู่ในเอกสารสาธารณะ
- เจ้าหน้าที่ใช้ Google Sign-in ที่ `budget-login.html` แล้วตรวจสิทธิ์จาก `budget_users/{uid}` บัญชีใหม่ไม่ได้รับสิทธิ์เขียนโดยอัตโนมัติ
- ผู้ดูแลมี role `admin`; ฝ่ายงบประมาณมี role `editor` และบันทึกรายการ ยืมเงิน และจัดทำเอกสารได้ การยกเลิก/กู้คืนรายจ่ายและลบ/คืนค่าเอกสารจำกัดผู้ดูแล
- การเขียนทั้งหมดผ่าน callable `budgetApi` ซึ่งตรวจ Google provider, verified email, UID, email และ active profile ทุกครั้ง Browser เขียน Firestore โดยตรงไม่ได้
- การเปลี่ยนทะเบียนและยอดสรุปเกิดใน transaction เดียวกัน มี revision ป้องกันข้อมูลเก่า และ request ID ป้องกันบันทึกซ้ำ
- ปี 2570 เป็นปีที่เปิดบันทึก ยอดย้ายตั้งต้นคงเหลือรวม 3,245,071.38 บาท จาก 40 โครงการ/120 ทะเบียน ปี 2569 เป็นข้อมูลย้อนหลังอ่านอย่างเดียว รักษายอดสรุปเดิมซึ่งอาจต่างจากทะเบียนต้นทาง
- เอกสาร งบ 1–2 และเบิกจ่ายบันทึกส่วนกลาง Browser เก็บเฉพาะร่างกู้คืน เอกสารเดิมใน browser จะนำเข้าครั้งแรกเมื่อเจ้าหน้าที่เปิดหน้าประวัติด้วย browser เดิม โดยไม่เขียนทับเอกสารที่มีอยู่แล้ว
- ระบบจัดซื้อใน repository แยกยังใช้ตัวเชื่อมเดิม `school-auth.js` และ `budget-api.js` ไม่ได้ย้ายในงานนี้ Rules เดิมของ procurement ถูกเก็บไว้ทั้งหมด
- Google Sheets เป็นข้อมูลอ้างอิงสำรอง การแก้ Sheets หลังสลับจะไม่อัปเดต Firestore ให้บันทึกผ่านเว็บงบประมาณ การนำเข้าทั้งปีแบบเดิมยังไม่เปิดบนตัวเชื่อม Firebase

## โครงสร้าง

`budget_public_years/{year}` เก็บ JSON สรุปสาธารณะขนาดเล็ก อ่านด้วย `onSnapshot`; `budget_registers/{year-project}` เก็บทะเบียนภายใน; `budget_loans` เก็บรายการยืม; `budget_audit` และ `budget_operations` เก็บประวัติและผลคำขอ; `budget_documents` เก็บเอกสารภายใน ข้อมูลแต่ละระบบแยกจาก `procurement_*`

## Deploy และตรวจสอบ

```
npm ci --prefix functions
npm test --prefix functions
npx -y firebase-tools@latest deploy --only auth,firestore:rules,functions:school-budget --project school-budget-3e69d
```

โค้ดหน้าเว็บเผยแพร่ผ่าน GitHub Pages ส่วน Functions และ Rules deploy ด้วย Firebase CLI ห้ามนำไฟล์สำรองข้อมูลหรือ credentials เข้าสู่ repository นี้ ตรวจ Rules ที่ใช้งานจริงก่อน deploy เพื่อรักษาการเปลี่ยนแปลงในระบบ procurement

ตรวจแล้ว: guest อ่าน summary ได้และเขียนไม่ได้; private collections ปฏิเสธ guest; handler ปฏิเสธผู้ไม่อนุมัติ/อีเมลไม่ตรง/บัญชีไม่ verified; บันทึกซ้ำไม่หักเงินซ้ำ; transaction สองฝั่ง; ยกเลิกและกู้คืน; concurrent stale write; shared documents soft delete/restore โดยใช้ชุดข้อมูลทดสอบแยกและล้างหลังจบ ยังต้องให้เจ้าของบัญชีทดสอบ OAuth ผ่าน browser ของตนเอง
