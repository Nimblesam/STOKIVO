package com.Stokivo.app;

import android.os.Bundle;
import android.util.Log;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;

public class MainActivity extends AppCompatActivity {

    private static final String TAG = "STOKIVO_WEBVIEW";
    private static final String APP_URL = "https://stokivo.com";
    private WebView webView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        webView = findViewById(R.id.webview);
        setupWebView();
        
        if (savedInstanceState == null) {
            webView.loadUrl(APP_URL);
        }
    }

    private void setupWebView() {
        WebSettings settings = webView.getSettings();

        // Core Requirements
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);

        // File & Content Access
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        
        // Legacy Support flags
        settings.setAllowFileAccessFromFileURLs(true);
        settings.setAllowUniversalAccessFromFileURLs(true);

        // Viewport & Scale
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        settings.setSupportZoom(true);
        settings.setBuiltInZoomControls(true);
        settings.setDisplayZoomControls(false);

        // Stability & Rendering
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);

        // High compatibility WebViewClient
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                // Keep navigation inside the app
                view.loadUrl(url);
                return true;
            }

            @Override
            public void onReceivedError(WebView view, int errorCode, String description, String failingUrl) {
                String errorMsg = "Load Error [" + errorCode + "]: " + description;
                Log.e(TAG, errorMsg + " URL: " + failingUrl);
                Toast.makeText(MainActivity.this, errorMsg, Toast.LENGTH_LONG).show();
                showErrorPage(view, errorMsg);
            }

            // For newer WebViews (still good to have)
            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
                    onReceivedError(view, error.getErrorCode(), error.getDescription().toString(), request.getUrl().toString());
                }
            }
        });

        // Debugging support
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.KITKAT) {
            WebView.setWebContentsDebuggingEnabled(true);
        }
    }

    private void showErrorPage(WebView view, String error) {
        String htmlData = "<html><body style='text-align:center; padding-top:20%; font-family:sans-serif;'>" +
                "<h1>Connection Error</h1>" +
                "<p>" + error + "</p>" +
                "<button onclick='location.reload()' style='padding:10px 20px;'>Retry</button>" +
                "</body></html>";
        view.loadDataWithBaseURL(null, htmlData, "text/html", "UTF-8", null);
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
