import test from 'node:test';
import assert from 'node:assert/strict';
import {HeartRateMonitor} from '../utils/heartRateMonitor';
const until=async(predicate:()=>boolean)=>{const deadline=Date.now()+500;while(!predicate()){if(Date.now()>deadline)throw Error('Sensor recovery timed out');await new Promise(resolve=>setTimeout(resolve,5));}};
function fixture(){
 const original=Object.getOwnPropertyDescriptor(globalThis,'navigator');
 let choosers=0,connects=0,started=0,stopped=0;
 class Characteristic extends EventTarget {value=new DataView(new Uint8Array([0,140]).buffer);async startNotifications(){started++;return this;}async stopNotifications(){stopped++;}send(bpm:number){this.value=new DataView(new Uint8Array([0,bpm]).buffer);this.dispatchEvent(new Event('characteristicvaluechanged'));}}
 const characteristic=new Characteristic();
 class Device extends EventTarget {name='Sensor QA';gatt={connected:false,connect:async()=>{connects++;this.gatt.connected=true;return {getPrimaryService:async()=>({getCharacteristic:async()=>characteristic})};},disconnect:()=>{this.gatt.connected=false;this.dispatchEvent(new Event('gattserverdisconnected'));}};}
 const device=new Device();
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{bluetooth:{requestDevice:async()=>{choosers++;return device;}}}});
 return {device,characteristic,counts:()=>({choosers,connects,started,stopped}),restore:()=>{if(original)Object.defineProperty(globalThis,'navigator',original);else Reflect.deleteProperty(globalThis,'navigator');}};
}
test('a lost sensor reconnects without a second permission chooser and resumes distinct readings',async()=>{
 const f=fixture(),monitor=new HeartRateMonitor({pollMs:5,staleMs:1000,retryMs:10});const values:number[]=[];let losses=0,recoveries=0;
 try{await monitor.connect(m=>values.push(m.bpm),()=>losses++,()=>recoveries++);f.characteristic.send(140);f.device.gatt.disconnect();await until(()=>f.counts().started===2);f.characteristic.send(175);assert.deepEqual(values,[140,175]);assert.equal(losses,1);assert.equal(recoveries,1);assert.equal(f.counts().choosers,1);}finally{await monitor.disconnect();f.restore();}
});
test('notification-only sensors restart a stalled stream; subscriptions do not duplicate readings',async()=>{
 const f=fixture(),monitor=new HeartRateMonitor({pollMs:5,staleMs:20,retryMs:10});const values:number[]=[];let losses=0;
 try{await monitor.connect(m=>values.push(m.bpm),()=>losses++);f.characteristic.send(130);await until(()=>f.counts().started>=2);f.characteristic.send(160);assert.deepEqual(values,[130,160]);assert.equal(losses,1);assert.ok(f.counts().stopped>=1);assert.equal(f.counts().choosers,1);}finally{await monitor.disconnect();f.restore();}
});
test('intentional disconnect cancels retries and late sensor events',async()=>{
 const f=fixture(),monitor=new HeartRateMonitor({pollMs:5,staleMs:15,retryMs:5});const values:number[]=[];
 try{await monitor.connect(m=>values.push(m.bpm),()=>{});f.characteristic.send(135);await monitor.disconnect();const count=f.counts().connects;f.characteristic.send(170);f.device.dispatchEvent(new Event('gattserverdisconnected'));await new Promise(resolve=>setTimeout(resolve,40));assert.equal(f.counts().connects,count);assert.deepEqual(values,[135]);}finally{await monitor.disconnect();f.restore();}
});
