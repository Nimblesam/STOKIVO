package com.Stokivo.app.sunmi;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.ServiceConnection;
import android.content.ComponentName;
import android.os.IBinder;
import android.os.RemoteException;
import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.lang.reflect.Method;

/**
 * SUNMI hardware integration via Capacitor.
 *
 * This plugin uses reflection + AIDL/broadcast hooks so the JS layer can compile
 * and call sunmi.* on ALL Android devices (silent no-op on non-SUNMI hardware).
 *
 * Hardware features:
 *  - Printer (woyou IWoyouService AIDL or sunmi.printerservice broadcast fallback)
 *  - Scanner (com.sunmi.scanner.ACTION_DATA_CODE_RECEIVED broadcast)
 *  - Cash drawer (woyou service openDrawer / com.sunmi.cashdrawer fallback)
 *
 * To enable real hardware: drop the official SUNMI AAR libs into android/app/libs/
 * and these reflection calls will resolve at runtime. Without the libs, every
 * call returns { success: false, available: false } and the app keeps working.
 */
@CapacitorPlugin(name = "Sunmi")
public class SunmiPlugin extends Plugin {

    private static final String TAG = "SunmiPlugin";

    private static final String SUNMI_PRINTER_SERVICE = "woyou.aidlservice.jiuiv5.IWoyouService";
    private static final String SUNMI_SCAN_ACTION = "com.sunmi.scanner.ACTION_DATA_CODE_RECEIVED";
    private static final String SUNMI_SCAN_DATA = "data";
    private static final String SUNMI_SCAN_SOURCE = "source_byte";

    private Object printerService = null;
    private boolean serviceBound = false;
    private BroadcastReceiver scanReceiver = null;

    @Override
    public void load() {
        super.load();
        bindPrinterService();
        registerScannerReceiver();
    }

    private boolean isSunmiDevice() {
        String manufacturer = android.os.Build.MANUFACTURER;
        return manufacturer != null && manufacturer.toLowerCase().contains("sunmi");
    }

    /* ---------------- Printer Service Binding (reflection-safe) ---------------- */

    private final ServiceConnection printerConnection = new ServiceConnection() {
        @Override
        public void onServiceConnected(ComponentName name, IBinder service) {
            try {
                Class<?> stubClass = Class.forName(SUNMI_PRINTER_SERVICE + "$Stub");
                Method asInterface = stubClass.getMethod("asInterface", IBinder.class);
                printerService = asInterface.invoke(null, service);
                serviceBound = true;
                Log.i(TAG, "SUNMI printer service connected");
            } catch (Throwable t) {
                Log.w(TAG, "SUNMI printer service unavailable: " + t.getMessage());
                printerService = null;
                serviceBound = false;
            }
        }

        @Override
        public void onServiceDisconnected(ComponentName name) {
            printerService = null;
            serviceBound = false;
        }
    };

    private void bindPrinterService() {
        try {
            Intent intent = new Intent();
            intent.setPackage("woyou.aidlservice.jiuiv5");
            intent.setAction("woyou.aidlservice.jiuiv5.IWoyouService");
            getContext().bindService(intent, printerConnection, Context.BIND_AUTO_CREATE);
        } catch (Throwable t) {
            Log.w(TAG, "Failed to bind SUNMI printer service: " + t.getMessage());
        }
    }

    /* ---------------- Scanner Broadcast Receiver ---------------- */

    private void registerScannerReceiver() {
        scanReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                String code = intent.getStringExtra(SUNMI_SCAN_DATA);
                if (code == null || code.isEmpty()) {
                    byte[] raw = intent.getByteArrayExtra(SUNMI_SCAN_SOURCE);
                    if (raw != null) code = new String(raw);
                }
                if (code != null && !code.isEmpty()) {
                    JSObject data = new JSObject();
                    data.put("barcode", code.trim());
                    notifyListeners("barcodeScanned", data);
                }
            }
        };
        try {
            IntentFilter filter = new IntentFilter(SUNMI_SCAN_ACTION);
            getContext().registerReceiver(scanReceiver, filter);
            Log.i(TAG, "SUNMI scanner receiver registered");
        } catch (Throwable t) {
            Log.w(TAG, "Failed to register scanner receiver: " + t.getMessage());
        }
    }

    @Override
    protected void handleOnDestroy() {
        try { if (scanReceiver != null) getContext().unregisterReceiver(scanReceiver); } catch (Throwable ignored) {}
        try { if (serviceBound) getContext().unbindService(printerConnection); } catch (Throwable ignored) {}
        super.handleOnDestroy();
    }

    /* ---------------- JS-callable methods ---------------- */

    @PluginMethod
    public void isAvailable(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("isSunmi", isSunmiDevice());
        ret.put("printerReady", serviceBound && printerService != null);
        call.resolve(ret);
    }

    @PluginMethod
    public void printReceipt(PluginCall call) {
        String text = call.getString("text", "");
        boolean cut = call.getBoolean("cut", true);

        if (!serviceBound || printerService == null) {
            JSObject ret = new JSObject();
            ret.put("success", false);
            ret.put("reason", "Printer service not bound");
            call.resolve(ret);
            return;
        }

        try {
            // printerInit()
            invokePrinter("printerInit", new Class[]{Class.forName("woyou.aidlservice.jiuiv5.ICallback")}, new Object[]{null});
            // setAlignment(0)  0=left, 1=center, 2=right
            invokePrinter("setAlignment", new Class[]{int.class, Class.forName("woyou.aidlservice.jiuiv5.ICallback")}, new Object[]{0, null});
            // printText(String, ICallback)
            invokePrinter("printText", new Class[]{String.class, Class.forName("woyou.aidlservice.jiuiv5.ICallback")}, new Object[]{text + "\n\n\n", null});
            if (cut) {
                try {
                    invokePrinter("cutPaper", new Class[]{Class.forName("woyou.aidlservice.jiuiv5.ICallback")}, new Object[]{null});
                } catch (Throwable ignored) {}
            }
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Throwable t) {
            Log.e(TAG, "Printer error: " + t.getMessage());
            JSObject ret = new JSObject();
            ret.put("success", false);
            ret.put("reason", t.getMessage());
            call.resolve(ret);
        }
    }

    @PluginMethod
    public void openCashDrawer(PluginCall call) {
        // Try AIDL first
        if (serviceBound && printerService != null) {
            try {
                invokePrinter("openDrawer", new Class[]{Class.forName("woyou.aidlservice.jiuiv5.ICallback")}, new Object[]{null});
                JSObject ret = new JSObject();
                ret.put("success", true);
                call.resolve(ret);
                return;
            } catch (Throwable ignored) {
                // Fall through to broadcast
            }
        }
        // Broadcast fallback (some SUNMI models)
        try {
            Intent intent = new Intent("com.sunmi.cashdrawer.action.OPEN");
            getContext().sendBroadcast(intent);
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Throwable t) {
            JSObject ret = new JSObject();
            ret.put("success", false);
            ret.put("reason", t.getMessage());
            call.resolve(ret);
        }
    }

    /** Lets JS unlock soft-scanner mode if needed. */
    @PluginMethod
    public void enableScanner(PluginCall call) {
        try {
            Intent intent = new Intent("com.sunmi.scanner.ACTION_SET_TRIGGER_DATA");
            intent.putExtra("trigger", true);
            getContext().sendBroadcast(intent);
        } catch (Throwable ignored) {}
        JSObject ret = new JSObject();
        ret.put("success", true);
        call.resolve(ret);
    }

    /* ---------------- helpers ---------------- */

    private Object invokePrinter(String methodName, Class[] paramTypes, Object[] args) throws Throwable {
        Method m = printerService.getClass().getMethod(methodName, paramTypes);
        return m.invoke(printerService, args);
    }
}
