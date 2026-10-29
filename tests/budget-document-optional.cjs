const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { test } = require('node:test');
const source = fs.readFileSync('budget-document-editor.js', 'utf8');
const printSource = source.slice(source.indexOf(' async function print(kind)'), source.indexOf('\n try{const user='));
test('งบ 2 prints with optional middle fields empty, but still requires document headers', async () => {
  const data = {id:'saved',requestAmount:'100',fields:{number2:'2/70',date2:'2026-10-29',activityOwner:'A',projectOwner:'B',departmentHead:'C'}};
  let prints=0, message='', revealed='';
  const context=vm.createContext({data,busy:false,$:()=>({options:[]}),fieldSpecs:[['headers',[['number2','เลขที่หนังสือ งบ 2'],['date2','วันที่ งบ 2']]]],status:s=>{message=s},fontReady:Promise.resolve(),document:{fonts:{ready:Promise.resolve()}},draw(){},window:{print(){prints++},budgetDocumentSections:{reveal:k=>{revealed=k}}}});
  vm.runInContext(printSource,context);
  await context.print('two');
  assert.equal(prints,1);
  data.fields.number2='';
  await context.print('two');
  assert.equal(prints,1);
  assert.equal(revealed,'number2');
  assert.match(message,/เลขที่หนังสือ/);
});
