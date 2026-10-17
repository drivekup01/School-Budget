const {test}=require('node:test');const assert=require('node:assert/strict');const vm=require('node:vm');const fs=require('node:fs');
const source=fs.readFileSync('budget-import.js','utf8');
async function boot(user){const elements={};const document={getElementById(id){return elements[id]??=( {hidden:true,textContent:'',listeners:{},addEventListener(n,f){this.listeners[n]=f;}});}};await vm.runInNewContext(source,{window:{schoolAuthReady:Promise.resolve(user)},document});return elements;}
test('only exact admin account can initialize file input',async()=>{for(const user of [{id:'guest',role:'guest'},{id:'drivekup1',role:'admin'},{id:'teanpak.su',role:'editor'}]){const e=await boot(user);assert.equal(e.importContent,undefined);assert.equal(e.importFile,undefined);}const e=await boot({id:'teanpak.su',role:'admin'});assert.equal(e.importContent.hidden,false);assert.equal(typeof e.importFile.listeners.change,'function');});

