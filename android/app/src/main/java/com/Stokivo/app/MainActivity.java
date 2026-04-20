package com.Stokivo.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.Stokivo.app.sunmi.SunmiPlugin;

/**
 * Stokivo Android entry point.
 *
 * Extends Capacitor's BridgeActivity so the JS bridge is initialised and the
 * SunmiPlugin (printer / scanner / cash drawer) is registered. The web app is
 * loaded from the bundled `dist/` assets via Capacitor — NOT from a remote URL —
 * which keeps the POS usable offline and lets AppModeContext detect the native
 * shell and route straight into POS mode.
 */
public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Register custom plugins BEFORE super.onCreate so the bridge picks them up.
        registerPlugin(SunmiPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
