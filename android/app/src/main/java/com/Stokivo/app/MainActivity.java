package com.Stokivo.app;

import android.os.Bundle;
import android.util.Log;
import android.webkit.ConsoleMessage;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;

public class MainActivity extends AppCompatActivity {

    private static final String TAG = "STOKIVO_APP";
    private static final String START_URL = "https://stokivo.com/login";
    private WebView webView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // Use a rock-solid system theme to prevent "keeps stopping" crashes
        setTheme(android.R.style.Theme_NoTitleBar_Fullscreen);
        super.onCreate(savedInstanceState);

        // Create WebView programmatically to bypass layout issues
        webView = new WebView(this);
        setContentView(webView);

        configureWebView();

        if (savedInstanceState == null) {
            Log.d(TAG, "Loading Start URL: " + START_URL);
            webView.loadUrl(START_URL);
        }
    }

    private void configureWebView() {
        WebSettings s = webView.getSettings();
        
        // Essential JS & Storage
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setSaveFormData(true);
        
        // Compatibility Flags for Sunmi V2 Pro (Android 7)
        s.setAllowFileAccess(true);
        s.setAllowContentAccess(true);
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);
        s.setJavaScriptCanOpenWindowsAutomatically(true);
        
        // Mixed Content (Allows loading images/scripts from mixed sources)
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.LOLLIPOP) {
            s.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        }

        // Enable Remote Debugging (chrome://inspect)
        WebView.setWebContentsDebuggingEnabled(true);

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onReceivedError(WebView view, int errorCode, String description, String failingUrl) {
                Log.e(TAG, "Error: " + description + " at " + failingUrl);
                Toast.makeText(MainActivity.this, "Connection Error: " + description, Toast.LENGTH_SHORT).show();
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                // Allow the WebView to handle its own navigation/redirects
                return false; 
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onConsoleMessage(ConsoleMessage consoleMessage) {
                Log.d(TAG, "JS: " + consoleMessage.message());
                return true;
            }
        });
    }

    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}
