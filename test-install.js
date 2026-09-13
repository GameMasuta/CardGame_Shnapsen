const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
function setup({ios=false, ipad=false, standalone=false, android=false, storage=new Map(), storageThrows=false}={}) {
 const els = {};
 const listeners = {};
 const media = {matches:standalone,addEventListener:()=>{}};
 const context={navigator:{userAgent:ios?'iPhone':android?'Android Chrome':'Chrome',platform:ipad?'MacIntel':'Linux',maxTouchPoints:ipad?5:0},window:{localStorage:{getItem(k){if(storageThrows)throw Error();return storage.get(k)},setItem(k,v){if(storageThrows)throw Error();storage.set(k,v)}},matchMedia:()=>media,addEventListener:(k,f)=>listeners[k]=f},document:{getElementById(id){return els[id]??=( {hidden:true,open:false,focus(){},setAttribute(){},handlers:{},addEventListener(k,f){this.handlers[k]=f},showModal(){this.open=true},close(){this.open=false}});}}};
 vm.runInNewContext(fs.readFileSync('install.js','utf8'),context);
 return {els,listeners,media};
}
(async()=>{
 for(const opts of [{ios:true},{ipad:true}]) {
  const {els}=setup(opts); assert.equal(els['install-button'].hidden,false);
  els['install-button'].handlers.click(); assert.match(els['install-description'].textContent,/Safari/); assert.equal(els['install-confirm'].hidden,true);
 }
 const {els,listeners}=setup(); assert.equal(els['install-button'].hidden,true);
 let prompted=0;
 listeners.beforeinstallprompt({preventDefault(){},prompt:async()=>{prompted++},userChoice:Promise.resolve({outcome:'accepted'})});
 assert.equal(els['install-button'].hidden,false);
 els['install-button'].handlers.click(); assert.equal(els['install-dialog'].open,true);
 els['install-cancel'].handlers.click(); assert.equal(prompted,0);
 els['install-button'].handlers.click(); await els['install-confirm'].handlers.click();
 assert.equal(prompted,1); assert.equal(els['install-button'].hidden,true);
 await els['install-confirm'].handlers.click(); assert.equal(prompted,1);
 assert.equal(setup({standalone:true,ios:true}).els['install-button'].hidden,true);
 const fail=setup(); fail.listeners.beforeinstallprompt({preventDefault(){},prompt:async()=>{throw Error('failed')}});
 await fail.els['install-confirm'].handlers.click(); assert.match(fail.els['install-description'].textContent,/開始できません/);
 const dismissed=setup(); dismissed.listeners.beforeinstallprompt({preventDefault(){},prompt:async()=>{},userChoice:Promise.resolve({outcome:'dismissed'})});
 await dismissed.els['install-confirm'].handlers.click(); assert.equal(dismissed.els['install-button'].hidden,true);
 listeners.appinstalled(); assert.equal(els['install-button'].hidden,true);
 const store = new Map();
 const first = setup({ios:true,storage:store});
 assert.equal(first.els['install-label'].textContent,'追加方法を見る');
 assert.equal(first.els['install-hint'].hidden,false);
 first.els['install-hint-close'].handlers.click();
 assert.equal(first.els['install-hint'].hidden,true);
 first.listeners.pageshow(); assert.equal(first.els['install-hint'].hidden,true);
 assert.equal(setup({ios:true,storage:store}).els['install-hint'].hidden,true);
 const android = setup({android:true});
 assert.equal(android.els['install-label'].textContent,'ホーム画面に追加');
 assert.equal(android.els['install-hint'].hidden,true);
 android.listeners.beforeinstallprompt({preventDefault(){}});
 assert.equal(android.els['install-hint'].hidden,false);
 android.listeners.appinstalled(); assert.equal(android.els['install-hint'].hidden,true);
 assert.equal(setup().els['install-label'].textContent,'アプリをインストール');
 assert.equal(setup({ios:true,storageThrows:true}).els['install-hint'].hidden,false);
 console.log('Install tests passed');
})().catch(e=>{console.error(e);process.exitCode=1});
