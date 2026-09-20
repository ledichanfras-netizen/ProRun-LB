export interface HeartRateMeasurement {
  bpm: number;
  timestamp: number;
}

interface BluetoothCharacteristicLike {
  startNotifications(): Promise<BluetoothCharacteristicLike>;
  readValue?(): Promise<DataView>;
  stopNotifications?(): Promise<void>;
  addEventListener(type: string, listener: (event: Event) => void): void;
  removeEventListener(type: string, listener: (event: Event) => void): void;
}

interface BluetoothDeviceLike {
  name?: string;
  gatt?: {
    connected: boolean;
    connect(): Promise<{
      getPrimaryService(uuid: string): Promise<{
        getCharacteristic(uuid: string): Promise<BluetoothCharacteristicLike>;
      }>;
    }>;
  };
  addEventListener(type: string, listener: (event: Event) => void): void;
}

interface BluetoothNavigator extends Navigator {
  bluetooth?: {
    requestDevice(options: {
      filters: { services: string[] }[];
      optionalServices?: string[];
    }): Promise<BluetoothDeviceLike>;
  };
}

const HEART_RATE_SERVICE = 'heart_rate';
const HEART_RATE_CHARACTERISTIC = 'heart_rate_measurement';

export class HeartRateMonitor {
  private device: BluetoothDeviceLike | null = null;
  private characteristic: BluetoothCharacteristicLike | null = null;
  private measurementHandler: ((event: Event) => void) | null = null;
  private disconnectHandler: ((event: Event) => void) | null = null;
  private pollingInterval: ReturnType<typeof setInterval> | null = null;

  get isSupported() {
    return Boolean((navigator as BluetoothNavigator).bluetooth);
  }

  async connect(onMeasurement: (measurement: HeartRateMeasurement) => void, onDisconnect: () => void) {
    const bluetooth = (navigator as BluetoothNavigator).bluetooth;
    if (!bluetooth) {
      throw new Error('Bluetooth Low Energy não é suportado neste navegador.');
    }

    this.device = await bluetooth.requestDevice({
      filters: [{ services: [HEART_RATE_SERVICE] }]
    });

    if (!this.device.gatt) {
      throw new Error('Este sensor não oferece conexão GATT.');
    }

    const server = await this.device.gatt.connect();
    const service = await server.getPrimaryService(HEART_RATE_SERVICE);
    this.characteristic = await service.getCharacteristic(HEART_RATE_CHARACTERISTIC);

    const processMeasurement = (value: DataView | undefined) => {
      if (!value) return;

      const flags = value.getUint8(0);
      const is16Bit = (flags & 0x01) === 1;
      const bpm = is16Bit ? value.getUint16(1, true) : value.getUint8(1);
      if (bpm > 0 && bpm < 260) {
        onMeasurement({ bpm, timestamp: Date.now() });
      }
    };

    this.measurementHandler = (event: Event) => {
      processMeasurement((event.target as { value?: DataView } | null)?.value);
    };

    this.disconnectHandler = () => onDisconnect();
    this.characteristic.addEventListener('characteristicvaluechanged', this.measurementHandler);
    this.device.addEventListener('gattserverdisconnected', this.disconnectHandler);
    await this.characteristic.startNotifications();

    if (this.characteristic.readValue) {
      this.pollingInterval = setInterval(async () => {
        try {
          if (this.characteristic?.readValue) {
            const val = await this.characteristic.readValue();
            processMeasurement(val);
          }
        } catch {
          // Alguns sensores aceitam somente notificações; elas continuam ativas.
        }
      }, 1000);
    }

    return { name: this.device.name || 'Sensor cardíaco' };
  }

  async disconnect() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    if (this.characteristic && this.measurementHandler) {
      this.characteristic.removeEventListener('characteristicvaluechanged', this.measurementHandler);
      if (this.characteristic.stopNotifications) await this.characteristic.stopNotifications();
    }
    this.characteristic = null;
    this.measurementHandler = null;
    this.disconnectHandler = null;

    if (this.device?.gatt?.connected) {
      const gatt = this.device.gatt as { disconnect?: () => void };
      gatt.disconnect?.();
    }
    this.device = null;
  }
}