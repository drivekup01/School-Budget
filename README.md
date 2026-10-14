# School-Budget

ระบบงบประมาณของโรงเรียนค่ายบางระจันวิทยาคม แยกจาก School-Portal และ School-Procurement

## หน้าที่ใช้งาน

- `index.html` เปิดภาพรวมงบประมาณ
- `budget-dashboard.html` / `.css` / `.js` ภาพรวมและการ์ดรายรับ–คงเหลือ
- `budget-projects.html` / `.css` / `.js` โครงการและกิจกรรม
- `budget-balances.js` สรุปรายรับและยอดคงเหลือจาก Sheet ยอดคงเหลือ
- `budget-project-ledgers.js` รายการทะเบียนใช้เงินรายโครงการ
- `budget-data.json` สำเนาข้อมูลหลักจากทะเบียนคุมเงินบริหารวิชาการ 2569 ยังไม่ซิงก์อัตโนมัติ
- `budget-sidebar.js` / `.css` Sidebar กลางที่ระบบเอกสารเรียกใช้ร่วมกัน
- `legacy-dashboard.html` หน้าทดลองเดิมที่เก็บไว้ก่อนย้ายระบบ ไม่ใช่หน้าหลัก

## ลิงก์ระบบ

- งบประมาณ: https://drivekup01.github.io/School-Budget/
- เอกสารจัดซื้อ / จัดจ้าง: https://drivekup01.github.io/School-Procurement/history.html#history
- หน้าแรกโรงเรียน: https://drivekup01.github.io/School-Portal/

ไฟล์เอกสารและระบบบันทึกเอกสารยังอยู่ใน School-Procurement ข้อมูลรายรับและคงเหลือไม่ย้ายไปฐานข้อมูลใหม่ในการย้าย repository นี้
