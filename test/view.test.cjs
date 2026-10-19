const {test} = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const {getHtml} = require('../src/view');

test('webview script parses, uses a CSP and has no password entry surface', () => {
  const html=getHtml();
  assert(html.includes("default-src 'none'"));
  assert(!html.includes('unsafe-inline'));
  assert(!/\son\w+\s*=/.test(html));
  assert(!/<input/i.test(html));
  const script=html.match(/<script nonce="[^"]+">([\s\S]*?)<\/script>/)[1];
  new vm.Script(script);
});
test('selection and open events work while user labels remain text', () => {
  const html=getHtml(), messages=[], handlers={};
  const elements={};
  for(const id of ['users','open','refresh','browse','status','executable'])elements[id]={value:'',options:[],listeners:{},addEventListener(name,fn){this.listeners[name]=fn;},replaceChildren(){this.options=[];},appendChild(option){this.options.push(option);}};
  const context={document:{getElementById:id=>elements[id],createElement:()=>({})},window:{addEventListener:(type,fn)=>handlers[type]=fn},acquireVsCodeApi:()=>({getState:()=>({}),setState(){},postMessage:message=>messages.push(message)})};
  vm.runInNewContext(html.match(/<script nonce="[^"]+">([\s\S]*?)<\/script>/)[1],context);
  assert.equal(messages[0].type,'ready');
  handlers.message({data:{type:'state',users:[{name:'ExampleUser',current:true},{name:'<img src=x>',current:false}],busy:false,status:'Ready',executable:'E:\\Code.exe'}});
  assert.equal(elements.users.value,'ExampleUser');
  assert.equal(elements.users.options[1].textContent,'<img src=x>');
  elements.open.listeners.click();assert.equal(messages.at(-1).user,'ExampleUser');
  elements.browse.listeners.click();assert.equal(messages.at(-1).type,'browse');
  handlers.message({data:{type:'state',users:[{name:'ExampleUser',current:true}],busy:true,status:'Waiting',executable:'E:\\Code.exe'}});
  assert(elements.open.disabled);assert(elements.browse.disabled);
});
