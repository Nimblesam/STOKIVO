package com.Stokivo.app;

import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;
import com.Stokivo.app.sunmi.SunmiPlugin;

public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // Register custom plugins BEFORE super.onCreate
        registerPlugin(SunmiPlugin.class);
        super.onCreate(savedInstanceState);

        // Explicitly enable WebView features for Sunmi V2 Pro (Android 7.1.2)
        // We DO NOT set a custom WebViewClient here, as it breaks the Capacitor Bridge
        WebView webView = getBridge().getWebView();
        if (webView != null) {
            // Enable WebView debugging (for Chrome Remote Inspect)
            WebView.setWebContentsDebuggingEnabled(true);

            WebSettings settings = webView.getSettings();
            
            // Essential Settings
            settings.setJavaScriptEnabled(true);
            settings.setDomStorageEnabled(true);
            settings.setDatabaseEnabled(true);
            
            // Legacy File Access (Critical for Android 7)
            settings.setAllowFileAccess(true);
            settings.setAllowContentAccess(true);
            settings.setAllowFileAccessFromFileURLs(true);
            settings.setAllowUniversalAccessFromFileURLs(true);
            
            // Performance & Rendering for older hardware
            settings.setCacheMode(WebSettings.LOAD_DEFAULT);
            settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
            
            // Ensure the WebView occupies the full screen correctly
            webView.setFitsSystemWindows(true);
        }
    }
}
