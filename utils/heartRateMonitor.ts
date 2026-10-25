export interface HeartRateMeasurement {bpm:number;timestamp:number;}
interface BluetoothCharacteristicLike {
  startNotifications():Promise<BluetoothCharacteristicLike>;
  readValue?():Promise<DataView>;
  stopNotifications?():Promise<void>;
  addEventListener(type:string,listener:(event:Event)=>void):void;
  removeEventListener(type:string,listener:(event:Event)=>void):void;
}
interface BluetoothDeviceLike {
  name?:string;
  gatt?:{connected:boolean;connect():Promise<{getPrimaryService(uuid:string):Promise<{getCharacteristic(uuid:string):Promise<BluetoothCharacteristicLike>}>}>;disconnect?():void;};
  addEventListener(type:string,listener:(event:Event)=>void):void;
  removeEventListener?(type:string,listener:(event:Event)=>void):void;
}
interface BluetoothNavigator extends Navigator {bluetooth?:{requestDevice(options:{filters:{services:string[]}[];optionalServices?:string[]}):Promise<BluetoothDeviceLike>};}
export class HeartRateMonitor {
  private device:BluetoothDeviceLike|null=null;
  private characteristic:BluetoothCharacteristicLike|null=null;
  private measurementHandler:((event:Event)=>void)|null=null;
  private disconnectHandler:((event:Event)=>void)|null=null;
  private visibilityHandler:(()=>void)|null=null;
  private pollingInterval:ReturnType<typeof setInterval>|null=null;
  private generation=0;
  private active=false;
  constructor(private timing={pollMs:1000,staleMs:15000,retryMs:3000}){}
  get isSupported(){return typeof navigator!=='undefined'&&Boolean((navigator as BluetoothNavigator).bluetooth);}
  async connect(onMeasurement:(measurement:HeartRateMeasurement)=>void,onDisconnect:()=>void,onReconnect?:(device:{name:string})=>void){
    const bluetooth=(navigator as BluetoothNavigator).bluetooth;
    if(!bluetooth)throw new Error('Bluetooth Low Energy não é suportado neste navegador.');
    await this.disconnect();
    const generation=this.generation;
    const device=await bluetooth.requestDevice({filters:[{services:['heart_rate']}]});
    if(generation!==this.generation)throw new Error('Conexão cancelada.');
    if(!device.gatt)throw new Error('Este sensor não oferece conexão GATT.');
    this.device=device;this.active=true;
    const alive=()=>this.active&&generation===this.generation;
    let lastReceived=Date.now(),outage=false,recovering=false,reading=false,nextRetry=0;
    const notifyLoss=()=>{if(!outage&&alive()){outage=true;onDisconnect();}};
    const process=(value:DataView|undefined)=>{
      if(!alive()||!value||value.byteLength<2)return;
      const is16Bit=(value.getUint8(0)&1)===1;
      if(is16Bit&&value.byteLength<3)return;
      const bpm=is16Bit?value.getUint16(1,true):value.getUint8(1);
      if(bpm<=0||bpm>=260)return;
      lastReceived=Date.now();
      if(outage){outage=false;onReconnect?.({name:device.name||'Sensor cardíaco'});}
      onMeasurement({bpm,timestamp:lastReceived});
    };
    const bind=async()=>{
      const server=await device.gatt!.connect();
      if(!alive()){if(this.device!==device)device.gatt?.disconnect?.();return;}
      const service=await server.getPrimaryService('heart_rate');
      const characteristic=await service.getCharacteristic('heart_rate_measurement');
      if(!alive())return;
      if(this.characteristic&&this.measurementHandler)this.characteristic.removeEventListener('characteristicvaluechanged',this.measurementHandler);
      const old=this.characteristic;
      this.characteristic=characteristic;
      const handler=(event:Event)=>{if(this.characteristic===characteristic)process((event.target as {value?:DataView}|null)?.value);};
      this.measurementHandler=handler;
      characteristic.addEventListener('characteristicvaluechanged',handler);
      if(old)try{await old.stopNotifications?.();}catch{}
      if(!alive()){characteristic.removeEventListener('characteristicvaluechanged',handler);return;}
      await characteristic.startNotifications();
      if(!alive()){characteristic.removeEventListener('characteristicvaluechanged',handler);void characteristic.stopNotifications?.().catch(()=>{});return;}
      reading=false;lastReceived=Date.now();
    };
    const recover=async()=>{
      if(!alive()||recovering||Date.now()<nextRetry)return;
      recovering=true;nextRetry=Date.now()+this.timing.retryMs;
      try{await bind();}catch{/* Retry the already authorized device; never open another chooser. */}
      finally{recovering=false;}
    };
    const poll=async()=>{
      if(!alive())return;
      if(!device.gatt?.connected||Date.now()-lastReceived>this.timing.staleMs){notifyLoss();void recover();return;}
      const characteristic=this.characteristic;
      if(reading||recovering||!characteristic?.readValue)return;
      reading=true;
      try{const value=await characteristic.readValue();if(alive()&&this.characteristic===characteristic)process(value);}catch{/* Notification-only sensors do not support reads. */}finally{reading=false;}
    };
    this.disconnectHandler=()=>{if(alive()){notifyLoss();nextRetry=0;void recover();}};
    device.addEventListener('gattserverdisconnected',this.disconnectHandler);
    try{await bind();if(!alive())throw new Error('Conexão cancelada.');}
    catch(error){if(alive())await this.disconnect();throw error;}
    this.pollingInterval=setInterval(()=>{void poll();},this.timing.pollMs);
    this.visibilityHandler=()=>{if(document.visibilityState==='visible')void poll();};
    if(typeof document!=='undefined')document.addEventListener('visibilitychange',this.visibilityHandler);
    return {name:device.name||'Sensor cardíaco'};
  }
  async disconnect(){
    this.active=false;this.generation++;
    if(this.pollingInterval)clearInterval(this.pollingInterval);this.pollingInterval=null;
    if(this.visibilityHandler&&typeof document!=='undefined')document.removeEventListener('visibilitychange',this.visibilityHandler);this.visibilityHandler=null;
    const characteristic=this.characteristic,handler=this.measurementHandler,device=this.device;
    this.characteristic=null;this.measurementHandler=null;this.device=null;
    if(device&&this.disconnectHandler)device.removeEventListener?.('gattserverdisconnected',this.disconnectHandler);this.disconnectHandler=null;
    if(characteristic&&handler)characteristic.removeEventListener('characteristicvaluechanged',handler);
    try{device?.gatt?.disconnect?.();}catch{}
    if(characteristic)void characteristic.stopNotifications?.().catch(()=>{});
  }
}
