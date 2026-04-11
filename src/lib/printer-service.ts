/**
 * ESC/POS Printer & Cash Drawer Service
 * Uses Web Serial API for ESC/POS compatible receipt printers with cash drawer kick
 */

// ESC/POS commands
const ESC = 0x1B;
const GS = 0x1D;
const INIT = new Uint8Array([ESC, 0x40]); // Initialize printer
const CUT = new Uint8Array([GS, 0x56, 0x00]); // Full cut
const CASH_DRAWER_PIN2 = new Uint8Array([ESC, 0x70, 0x00, 0x3C, 0xFF]); // Kick pin 2
const CASH_DRAWER_PIN5 = new Uint8Array([ESC, 0x70, 0x01, 0x3C, 0xFF]); // Kick pin 5

export type PrinterStatus = "disconnected" | "connecting" | "connected" | "error";

interface PrinterState {
  port: any; // SerialPort
  writer: any; // WritableStreamDefaultWriter
  status: PrinterStatus;
  printerName: string | null;
  error: string | null;
}

let state: PrinterState = {
  port: null,
  writer: null,
  status: "disconnected",
  printerName: null,
  error: null,
};

const listeners = new Set<() => void>();

export function subscribePrinter(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function notify() {
  listeners.forEach((cb) => cb());
}

function updateState(partial: Partial<PrinterState>) {
  Object.assign(state, partial);
  notify();
}

export function getPrinterState() {
  return { ...state };
}

export function isSerialSupported(): boolean {
  return "serial" in navigator;
}

export function isBluetoothSupported(): boolean {
  return "bluetooth" in navigator;
}

export async function connectPrinter(method: "serial" | "bluetooth" = "serial"): Promise<boolean> {
  if (method === "bluetooth") {
    return connectBluetoothPrinter();
  }

  if (!isSerialSupported()) {
    updateState({ status: "error", error: "Web Serial API not supported in this browser" });
    return false;
  }

  try {
    updateState({ status: "connecting", error: null });

    const serial = (navigator as any).serial;
    const port = await serial.requestPort();
    await port.open({ baudRate: 9600 });

    const writer = port.writable?.getWriter() || null;
    const info = port.getInfo();
    const name = info.usbVendorId
      ? `USB Printer (${info.usbVendorId}:${info.usbProductId})`
      : "Serial Printer";

    updateState({ port, writer, status: "connected", printerName: name, error: null });

    if (writer) {
      await writer.write(INIT);
    }

    return true;
  } catch (err: any) {
    if (err.name === "NotFoundError") {
      updateState({ status: "disconnected", error: null });
    } else {
      updateState({ status: "error", error: err.message || "Failed to connect" });
    }
    return false;
  }
}

async function connectBluetoothPrinter(): Promise<boolean> {
  if (!isBluetoothSupported()) {
    updateState({ status: "error", error: "Web Bluetooth not supported in this browser" });
    return false;
  }

  try {
    updateState({ status: "connecting", error: null });

    const bt = (navigator as any).bluetooth;
    const device = await bt.requestDevice({
      filters: [{ services: ["000018f0-0000-1000-8000-00805f9b34fb"] }],
      optionalServices: ["000018f0-0000-1000-8000-00805f9b34fb"],
    }).catch(() => null);

    if (!device) {
      // Also try generic printers
      const genericDevice = await bt.requestDevice({
        acceptAllDevices: true,
        optionalServices: ["000018f0-0000-1000-8000-00805f9b34fb"],
      });
      if (!genericDevice) {
        updateState({ status: "disconnected", error: null });
        return false;
      }
      return await finishBluetoothConnect(genericDevice);
    }

    return await finishBluetoothConnect(device);
  } catch (err: any) {
    if (err.name === "NotFoundError") {
      updateState({ status: "disconnected", error: null });
    } else {
      updateState({ status: "error", error: err.message || "Bluetooth connection failed" });
    }
    return false;
  }
}

async function finishBluetoothConnect(device: any): Promise<boolean> {
  try {
    const server = await device.gatt?.connect();
    if (!server) {
      updateState({ status: "error", error: "Could not connect to Bluetooth GATT" });
      return false;
    }

    const service = await server.getPrimaryService("000018f0-0000-1000-8000-00805f9b34fb");
    const characteristic = await service.getCharacteristic("00002af1-0000-1000-8000-00805f9b34fb");

    // Create a writer-like interface for BLE
    const bleWriter = {
      write: async (data: Uint8Array) => {
        // BLE has MTU limits, send in 20-byte chunks
        for (let i = 0; i < data.length; i += 20) {
          const chunk = data.slice(i, i + 20);
          await characteristic.writeValue(chunk);
        }
      },
      releaseLock: () => {
        try { device.gatt?.disconnect(); } catch {}
      },
    };

    updateState({
      port: device,
      writer: bleWriter,
      status: "connected",
      printerName: `BT: ${device.name || "Bluetooth Printer"}`,
      error: null,
    });

    await bleWriter.write(INIT);
    return true;
  } catch (err: any) {
    updateState({ status: "error", error: err.message || "Bluetooth setup failed" });
    return false;
  }
}

export async function disconnectPrinter(): Promise<void> {
  try {
    if (state.writer) {
      state.writer.releaseLock();
    }
    if (state.port) {
      await state.port.close();
    }
  } catch {
    // ignore
  }
  updateState({ port: null, writer: null, status: "disconnected", printerName: null, error: null });
}

export async function openCashDrawer(): Promise<boolean> {
  if (state.status !== "connected" || !state.writer) {
    // Fallback: play audio cue if no printer connected
    playDrawerSound();
    return false;
  }

  try {
    await state.writer.write(CASH_DRAWER_PIN2);
    return true;
  } catch (err: any) {
    console.error("Failed to open cash drawer:", err);
    // Try to reconnect
    updateState({ status: "error", error: "Drawer command failed" });
    playDrawerSound();
    return false;
  }
}

export async function printReceipt(text: string): Promise<boolean> {
  // If connected to ESC/POS, use it
  if (state.status === "connected" && state.writer) {
    try {
      const encoder = new TextEncoder();
      await state.writer.write(INIT);
      await state.writer.write(encoder.encode(text));
      await state.writer.write(new Uint8Array([0x0A, 0x0A, 0x0A])); // Feed
      await state.writer.write(CUT);
      return true;
    } catch (err) {
      console.error("ESC/POS print failed, falling back to browser print:", err);
    }
  }

  // Fallback: use browser print dialog
  window.print();
  return true;
}

function playDrawerSound() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 800;
    gain.gain.value = 0.3;
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
    setTimeout(() => {
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.frequency.value = 600;
      gain2.gain.value = 0.2;
      osc2.start();
      osc2.stop(ctx.currentTime + 0.1);
    }, 150);
  } catch {
    // Audio not available
  }
}
