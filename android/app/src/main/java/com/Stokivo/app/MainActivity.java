package com.Stokivo.app;

import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.util.Log;
import android.widget.Toast;
import com.getcapacitor.BridgeActivity;
import com.Stokivo.app.sunmi.SunmiPlugin;

public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // Register custom plugins BEFORE super.onCreate
        registerPlugin(SunmiPlugin.class);
        super.onCreate(savedInstanceState);

        // Explicitly enable WebView features for Sunmi V2 Pro (Android 7.1.2)
        WebView webView = getBridge().getWebView();
        if (webView != null) {
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
            
            // Debugging Bridge
            webView.setWebViewClient(new WebViewClient() {
                @Override
                public void onPageFinished(WebView view, String url) {
                    super.onPageFinished(view, url);
                    Log.d("STOKIVO", "SUCCESS: Page loaded -> " + url);
                }

                @Override
                public void onReceivedError(WebView view, int errorCode, String description, String failingUrl) {
                    String msg = "WebView Error [" + errorCode + "]: " + description + " (URL: " + failingUrl + ")";
                    Log.e("STOKIVO", msg);
                    Toast.makeText(MainActivity.this, msg, Toast.LENGTH_LONG).show();
                }
            });

            // Disable edge-to-edge if it causes rendering issues on Sunmi
            webView.setFitsSystemWindows(true);
        }
    }
}
