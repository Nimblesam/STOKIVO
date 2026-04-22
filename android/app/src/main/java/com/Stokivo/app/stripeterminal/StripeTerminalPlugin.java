package com.Stokivo.app.stripeterminal;

import android.Manifest;
import android.app.Activity;
import android.content.pm.PackageManager;
import android.os.Build;
import android.util.Log;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import com.stripe.stripeterminal.Terminal;
import com.stripe.stripeterminal.TerminalApplicationDelegate;
import com.stripe.stripeterminal.external.callable.Callback;
import com.stripe.stripeterminal.external.callable.Cancelable;
import com.stripe.stripeterminal.external.callable.ConnectionTokenCallback;
import com.stripe.stripeterminal.external.callable.ConnectionTokenProvider;
import com.stripe.stripeterminal.external.callable.DiscoveryListener;
import com.stripe.stripeterminal.external.callable.PaymentIntentCallback;
import com.stripe.stripeterminal.external.callable.ReaderCallback;
import com.stripe.stripeterminal.external.callable.ReaderListener;
import com.stripe.stripeterminal.external.callable.TerminalListener;
import com.stripe.stripeterminal.external.models.CollectConfiguration;
import com.stripe.stripeterminal.external.models.ConnectionConfiguration;
import com.stripe.stripeterminal.external.models.ConnectionStatus;
import com.stripe.stripeterminal.external.models.ConnectionTokenException;
import com.stripe.stripeterminal.external.models.DiscoveryConfiguration;
import com.stripe.stripeterminal.external.models.PaymentIntent;
import com.stripe.stripeterminal.external.models.PaymentIntentParameters;
import com.stripe.stripeterminal.external.models.PaymentMethodType;
import com.stripe.stripeterminal.external.models.Reader;
import com.stripe.stripeterminal.external.models.TerminalException;
import com.stripe.stripeterminal.log.LogLevel;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

/**
 * Native Stripe Terminal bridge for Stokivo Android.
 *
 * Exposes Tap to Pay on Android (Local Mobile) + Internet/Bluetooth reader
 * support to the JS layer via Capacitor. The web (`use-terminal`) hook
 * detects this plugin at runtime and routes Terminal payments through it
 * instead of the JS Terminal SDK (which doesn't support Tap to Pay).
 *
 * JS surface (all return Promises):
 *   isAvailable()                                      -> { available, tapToPaySupported }
 *   initialize({ connectionToken })                    -> { initialized }
 *   provideConnectionToken({ token })                  -> internal callback
 *   discoverTapToPay()                                 -> { readers: [...] }
 *   connectTapToPay({ readerSerial?, locationId })     -> { reader }
 *   disconnect()                                       -> { ok }
 *   collectAndProcess({ clientSecret })                -> { paymentIntentId }
 *   cancelCollect()                                    -> { ok }
 *
 * IMPORTANT: This plugin does NOT touch Stripe Connect routing. The connected
 * account is already baked into the PaymentIntent on the server side
 * (see supabase/functions/create-terminal-payment).
 */
@CapacitorPlugin(name = "StripeTerminal", permissions = {})
public class StripeTerminalPlugin extends Plugin {

    private static final String TAG = "StripeTerminalPlugin";
    private static final int PERMISSION_REQUEST_CODE = 9421;

    private static final String[] REQUIRED_PERMISSIONS_API_31_PLUS = new String[] {
        Manifest.permission.ACCESS_FINE_LOCATION,
        Manifest.permission.BLUETOOTH_CONNECT,
        Manifest.permission.BLUETOOTH_SCAN,
    };

    private static final String[] REQUIRED_PERMISSIONS_LEGACY = new String[] {
        Manifest.permission.ACCESS_FINE_LOCATION,
    };

    private PluginCall pendingTokenCall;
    private ConnectionTokenCallback pendingTokenCallback;

    private Cancelable discoverCancelable;
    private Cancelable collectCancelable;
    private final List<Reader> lastDiscovered = new ArrayList<>();

    @Override
    public void load() {
        super.load();
        try {
            TerminalApplicationDelegate.onCreate(getActivity().getApplication());
        } catch (Throwable t) {
            Log.w(TAG, "TerminalApplicationDelegate.onCreate failed (non-fatal): " + t.getMessage());
        }
    }

    // ------------------------------------------------------------------
    // Capability check
    // ------------------------------------------------------------------

    @PluginMethod
    public void isAvailable(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("available", true); // plugin loaded
        boolean nfc = getContext().getPackageManager().hasSystemFeature(PackageManager.FEATURE_NFC);
        boolean apiOk = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O; // API 26+
        ret.put("tapToPaySupported", nfc && apiOk);
        ret.put("apiLevel", Build.VERSION.SDK_INT);
        ret.put("hasNfc", nfc);
        call.resolve(ret);
    }

    // ------------------------------------------------------------------
    // Initialization (must be called once before any other action)
    // ------------------------------------------------------------------

    @PluginMethod
    public void initialize(PluginCall call) {
        if (Terminal.isInitialized()) {
            JSObject ret = new JSObject();
            ret.put("initialized", true);
            ret.put("alreadyInitialized", true);
            call.resolve(ret);
            return;
        }

        ensurePermissions();

        ConnectionTokenProvider tokenProvider = new ConnectionTokenProvider() {
            @Override
            public void fetchConnectionToken(ConnectionTokenCallback callback) {
                pendingTokenCallback = callback;
                // Tell JS to fetch a fresh token; JS will call provideConnectionToken().
                JSObject data = new JSObject();
                notifyListeners("connectionTokenRequested", data);
            }
        };

        TerminalListener terminalListener = new TerminalListener() {
            @Override
            public void onConnectionStatusChange(ConnectionStatus status) {
                JSObject data = new JSObject();
                data.put("status", status.name());
                notifyListeners("connectionStatusChange", data);
            }

            @Override
            public void onUnexpectedReaderDisconnect(Reader reader) {
                JSObject data = new JSObject();
                data.put("readerSerial", reader.getSerialNumber());
                notifyListeners("unexpectedReaderDisconnect", data);
            }
        };

        try {
            Terminal.initTerminal(
                getActivity().getApplicationContext(),
                LogLevel.ERROR,
                tokenProvider,
                terminalListener
            );
            JSObject ret = new JSObject();
            ret.put("initialized", true);
            call.resolve(ret);
        } catch (Throwable t) {
            Log.e(TAG, "initialize failed", t);
            call.reject("Failed to initialize Stripe Terminal: " + t.getMessage());
        }
    }

    /** JS calls this in response to the "connectionTokenRequested" event. */
    @PluginMethod
    public void provideConnectionToken(PluginCall call) {
        String token = call.getString("token");
        String error = call.getString("error");
        if (pendingTokenCallback == null) {
            call.resolve();
            return;
        }
        if (token != null && !token.isEmpty()) {
            pendingTokenCallback.onSuccess(token);
        } else {
            pendingTokenCallback.onFailure(
                new ConnectionTokenException(error != null ? error : "No token provided")
            );
        }
        pendingTokenCallback = null;
        call.resolve();
    }

    // ------------------------------------------------------------------
    // Reader discovery (Tap to Pay)
    // ------------------------------------------------------------------

    @PluginMethod
    public void discoverTapToPay(final PluginCall call) {
        if (!Terminal.isInitialized()) {
            call.reject("Terminal not initialized");
            return;
        }

        // Cancel any in-flight discovery.
        cancelDiscoveryQuiet();

        DiscoveryConfiguration config = new DiscoveryConfiguration.LocalMobileDiscoveryConfiguration(
            /* isSimulated */ false
        );

        DiscoveryListener listener = new DiscoveryListener() {
            @Override
            public void onUpdateDiscoveredReaders(List<Reader> readers) {
                synchronized (lastDiscovered) {
                    lastDiscovered.clear();
                    lastDiscovered.addAll(readers);
                }
                JSObject data = new JSObject();
                data.put("readers", serializeReaders(readers));
                notifyListeners("readersDiscovered", data);
            }
        };

        Callback discoveryCallback = new Callback() {
            @Override
            public void onSuccess() {
                synchronized (lastDiscovered) {
                    JSObject ret = new JSObject();
                    ret.put("readers", serializeReaders(lastDiscovered));
                    call.resolve(ret);
                }
            }

            @Override
            public void onFailure(TerminalException e) {
                Log.e(TAG, "discoverTapToPay failure", e);
                call.reject(e.getErrorMessage(), e.getErrorCode().toString());
            }
        };

        try {
            discoverCancelable = Terminal.getInstance().discoverReaders(config, listener, discoveryCallback);
        } catch (Throwable t) {
            call.reject("Discovery failed: " + t.getMessage());
        }
    }

    private void cancelDiscoveryQuiet() {
        if (discoverCancelable != null && !discoverCancelable.isCompleted()) {
            try {
                discoverCancelable.cancel(new Callback() {
                    @Override public void onSuccess() {}
                    @Override public void onFailure(TerminalException e) {}
                });
            } catch (Throwable ignored) {}
        }
        discoverCancelable = null;
    }

    // ------------------------------------------------------------------
    // Reader connect (Tap to Pay / Local Mobile)
    // ------------------------------------------------------------------

    @PluginMethod
    public void connectTapToPay(final PluginCall call) {
        if (!Terminal.isInitialized()) {
            call.reject("Terminal not initialized");
            return;
        }
        final String locationId = call.getString("locationId");
        if (locationId == null || locationId.isEmpty()) {
            call.reject("locationId is required for Tap to Pay (e.g. 'tml_xxx')");
            return;
        }
        final String desiredSerial = call.getString("readerSerial");

        Reader target = null;
        synchronized (lastDiscovered) {
            for (Reader r : lastDiscovered) {
                if (desiredSerial == null || desiredSerial.equals(r.getSerialNumber())) {
                    target = r;
                    break;
                }
            }
        }
        if (target == null) {
            call.reject("No discovered reader available. Run discoverTapToPay first.");
            return;
        }

        ConnectionConfiguration.LocalMobileConnectionConfiguration config =
            new ConnectionConfiguration.LocalMobileConnectionConfiguration(locationId);

        ReaderCallback readerCallback = new ReaderCallback() {
            @Override
            public void onSuccess(Reader reader) {
                JSObject ret = new JSObject();
                ret.put("reader", serializeReader(reader));
                call.resolve(ret);
            }

            @Override
            public void onFailure(TerminalException e) {
                Log.e(TAG, "connectTapToPay failed", e);
                call.reject(e.getErrorMessage(), e.getErrorCode().toString());
            }
        };

        try {
            Terminal.getInstance().connectLocalMobileReader(target, config, readerCallback);
        } catch (Throwable t) {
            call.reject("Connect failed: " + t.getMessage());
        }
    }

    @PluginMethod
    public void disconnect(final PluginCall call) {
        if (!Terminal.isInitialized()) {
            call.resolve();
            return;
        }
        try {
            Terminal.getInstance().disconnectReader(new Callback() {
                @Override public void onSuccess() { call.resolve(); }
                @Override public void onFailure(TerminalException e) {
                    // Still resolve — disconnect failures aren't actionable.
                    call.resolve();
                }
            });
        } catch (Throwable t) {
            call.resolve();
        }
    }

    // ------------------------------------------------------------------
    // Payment collection (uses an existing PaymentIntent client_secret)
    // ------------------------------------------------------------------

    @PluginMethod
    public void collectAndProcess(final PluginCall call) {
        if (!Terminal.isInitialized()) {
            call.reject("Terminal not initialized");
            return;
        }
        final String clientSecret = call.getString("clientSecret");
        if (clientSecret == null || clientSecret.isEmpty()) {
            call.reject("clientSecret is required");
            return;
        }

        Terminal.getInstance().retrievePaymentIntent(clientSecret, new PaymentIntentCallback() {
            @Override
            public void onSuccess(PaymentIntent intent) {
                CollectConfiguration collectConfig = new CollectConfiguration.Builder().build();
                collectCancelable = Terminal.getInstance().collectPaymentMethod(intent, new PaymentIntentCallback() {
                    @Override
                    public void onSuccess(PaymentIntent collected) {
                        Terminal.getInstance().confirmPaymentIntent(collected, new PaymentIntentCallback() {
                            @Override
                            public void onSuccess(PaymentIntent processed) {
                                JSObject ret = new JSObject();
                                ret.put("paymentIntentId", processed.getId());
                                ret.put("status", processed.getStatus() != null ? processed.getStatus().name() : null);
                                call.resolve(ret);
                            }
                            @Override
                            public void onFailure(TerminalException e) {
                                Log.e(TAG, "confirmPaymentIntent failed", e);
                                call.reject(e.getErrorMessage(), e.getErrorCode().toString());
                            }
                        });
                    }
                    @Override
                    public void onFailure(TerminalException e) {
                        Log.e(TAG, "collectPaymentMethod failed", e);
                        call.reject(e.getErrorMessage(), e.getErrorCode().toString());
                    }
                }, collectConfig);
            }

            @Override
            public void onFailure(TerminalException e) {
                Log.e(TAG, "retrievePaymentIntent failed", e);
                call.reject(e.getErrorMessage(), e.getErrorCode().toString());
            }
        });
    }

    @PluginMethod
    public void cancelCollect(PluginCall call) {
        if (collectCancelable != null && !collectCancelable.isCompleted()) {
            try {
                collectCancelable.cancel(new Callback() {
                    @Override public void onSuccess() { call.resolve(); }
                    @Override public void onFailure(TerminalException e) { call.resolve(); }
                });
                return;
            } catch (Throwable ignored) {}
        }
        call.resolve();
    }

    // ------------------------------------------------------------------
    // Helpers
    // ------------------------------------------------------------------

    private void ensurePermissions() {
        Activity act = getActivity();
        if (act == null) return;
        String[] needed = Build.VERSION.SDK_INT >= Build.VERSION_CODES.S
            ? REQUIRED_PERMISSIONS_API_31_PLUS
            : REQUIRED_PERMISSIONS_LEGACY;

        List<String> missing = new ArrayList<>();
        for (String p : needed) {
            if (ContextCompat.checkSelfPermission(act, p) != PackageManager.PERMISSION_GRANTED) {
                missing.add(p);
            }
        }
        if (!missing.isEmpty()) {
            ActivityCompat.requestPermissions(act, missing.toArray(new String[0]), PERMISSION_REQUEST_CODE);
        }
    }

    private static JSArray serializeReaders(List<? extends Reader> readers) {
        JSArray arr = new JSArray();
        for (Reader r : readers) {
            arr.put(serializeReader(r));
        }
        return arr;
    }

    private static JSObject serializeReader(Reader r) {
        JSObject o = new JSObject();
        o.put("serialNumber", r.getSerialNumber());
        o.put("label", r.getLabel());
        o.put("deviceType", r.getDeviceType() != null ? r.getDeviceType().name() : null);
        o.put("locationId", r.getLocation() != null ? r.getLocation().getId() : null);
        return o;
    }
}
