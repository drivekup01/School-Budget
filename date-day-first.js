/* Display day/month/year while existing forms continue to store ISO dates. */
(() => {
 const value=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value');
 const iso=text=>{if(!text)return '';const m=/^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text);if(!m)return '';const s=m[3]+'-'+m[2]+'-'+m[1],d=new Date(s+'T12:00:00Z');return !Number.isNaN(+d)&&d.toISOString().slice(0,10)===s?s:'';};
 const display=s=>/^\d{4}-\d{2}-\d{2}$/.test(s)?s.slice(8,10)+'/'+s.slice(5,7)+'/'+s.slice(0,4):s;
 function enhance(input){if(input.dataset.dayFirst)return;const initial=input.value;input.dataset.dayFirst='true';input.type='text';input.placeholder='วว/ดด/ปปปป';input.inputMode='numeric';input.pattern='[0-9]{2}/[0-9]{2}/[0-9]{4}';input.maxLength=10;
 Object.defineProperty(input,'value',{configurable:true,get(){return iso(value.get.call(this));},set(v){value.set.call(this,display(String(v??'')));this.setCustomValidity('');}});input.value=initial;
 const wrap=document.createElement('span');wrap.className='day-first-date';input.before(wrap);wrap.append(input);const picker=document.createElement('input');picker.type='date';picker.className='day-first-picker';picker.tabIndex=-1;picker.setAttribute('aria-label','เลือกวันที่จากปฏิทิน');const button=document.createElement('button');button.type='button';button.className='day-first-calendar';button.textContent='📅';button.setAttribute('aria-label','เปิดปฏิทิน');wrap.append(button,picker);
 button.onclick=()=>{picker.value=input.value;try{picker.showPicker();}catch{picker.focus();picker.click();}};picker.onchange=()=>{input.value=picker.value;input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));};
 input.addEventListener('input',()=>{input.setCustomValidity(value.get.call(input)&&!input.value?'กรุณากรอกวันที่ วัน/เดือน/ปี เช่น 19/10/2026':'');});
 const sync=()=>{button.disabled=input.disabled||input.readOnly;picker.disabled=button.disabled;};new MutationObserver(sync).observe(input,{attributes:true,attributeFilter:['disabled','readonly']});sync();input.form?.addEventListener('reset',()=>setTimeout(()=>{input.value=initial;},0));
 }
 const scan=()=>document.querySelectorAll('input[type="date"]:not(.day-first-picker)').forEach(enhance);
 const style=document.createElement('style');style.textContent='.day-first-date{display:flex;position:relative;align-items:center;width:100%}.day-first-date>input:first-child{width:100%;padding-right:3.2rem;box-sizing:border-box}.day-first-calendar{position:absolute!important;right:6px;width:36px!important;padding:6px!important;border:0!important;background:transparent!important;color:inherit!important;box-shadow:none!important}.day-first-picker{position:absolute;width:1px!important;height:1px!important;opacity:0;pointer-events:none;padding:0!important;border:0!important;right:20px;bottom:0}';document.head.append(style);scan();new MutationObserver(scan).observe(document.body,{childList:true,subtree:true});
})();
