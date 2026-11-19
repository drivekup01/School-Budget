/* Display day/month/year while existing forms continue to store ISO dates. */
(() => {
 const value=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value');
 const iso=text=>{if(!text)return '';const m=/^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text);if(!m)return '';const s=m[3]+'-'+m[2]+'-'+m[1],d=new Date(s+'T12:00:00Z');return !Number.isNaN(+d)&&d.toISOString().slice(0,10)===s?s:'';};
 const display=s=>/^\d{4}-\d{2}-\d{2}$/.test(s)?s.slice(8,10)+'/'+s.slice(5,7)+'/'+s.slice(0,4):s;
 function enhance(input){if(input.dataset.dayFirst)return;const initial=input.value;input.dataset.dayFirst='true';input.type='text';input.placeholder='วว/ดด/ปปปป หรือกรอก 8 ตัวเลข';input.inputMode='numeric';input.pattern='[0-9]{2}/[0-9]{2}/[0-9]{4}';input.maxLength=10;
 Object.defineProperty(input,'value',{configurable:true,get(){return iso(value.get.call(this));},set(v){value.set.call(this,display(String(v??'')));this.setCustomValidity('');if(this.parentElement?.classList.contains('day-first-date'))this.parentElement.querySelector('.day-first-picker').value=this.value;}});input.value=initial;
 const wrap=document.createElement('span');wrap.className='day-first-date';input.before(wrap);wrap.append(input);const calendar=document.createElement('span');calendar.className='day-first-calendar';const icon=document.createElement('span');icon.setAttribute('aria-hidden','true');icon.textContent='📅';const picker=document.createElement('input');picker.type='date';picker.className='day-first-picker';picker.setAttribute('aria-label','เปิดปฏิทิน');calendar.append(icon,picker);wrap.append(calendar);
 picker.value=input.value;picker.onchange=()=>{input.value=picker.value;input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));};
 input.addEventListener('input',()=>{
  const text=value.get.call(input);
  if(/^\d{8}$/.test(text))value.set.call(input,text.slice(0,2)+'/'+text.slice(2,4)+'/'+text.slice(4));
  picker.value=input.value;
  input.setCustomValidity(value.get.call(input)&&!input.value?'กรุณากรอกวันที่ วัน/เดือน/ปี เช่น 19/10/2026':'');
 });
 const sync=()=>{picker.disabled=input.disabled||input.readOnly;};new MutationObserver(sync).observe(input,{attributes:true,attributeFilter:['disabled','readonly']});sync();input.form?.addEventListener('reset',()=>setTimeout(()=>{input.value=initial;},0));
 }
 const scan=()=>document.querySelectorAll('input[type="date"]:not(.day-first-picker)').forEach(enhance);
 const style=document.createElement('style');style.textContent='.day-first-date{display:flex;position:relative;align-items:center;width:100%}.day-first-date>input:first-child{width:100%;padding-right:3.2rem;box-sizing:border-box}.day-first-calendar{position:absolute;right:2px;top:50%;transform:translateY(-50%);width:44px;height:44px;display:grid;place-items:center}.day-first-calendar:focus-within{outline:2px solid currentColor;outline-offset:-3px;border-radius:6px}.day-first-calendar:has(input:disabled){opacity:.45}.day-first-calendar .day-first-picker{position:absolute;inset:0;width:100%!important;height:100%;min-height:0!important;opacity:0;margin:0!important;padding:0!important;border:0!important;cursor:pointer}.day-first-picker::-webkit-calendar-picker-indicator{position:absolute;inset:0;width:100%;height:100%;margin:0;padding:0;cursor:pointer}';document.head.append(style);scan();new MutationObserver(scan).observe(document.body,{childList:true,subtree:true});
})();
