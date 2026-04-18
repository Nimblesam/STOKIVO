package com.Stokivo.app;

import android.os.Bundle;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowCompat;
import com.getcapacitor.BridgeActivity;
import com.Stokivo.app.sunmi.SunmiPlugin;

public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // Register custom plugins BEFORE super.onCreate
        registerPlugin(SunmiPlugin.class);
        super.onCreate(savedInstanceState);

        // Enable edge-to-edge layout
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);

        // Handle window insets for the root view
        ViewCompat.setOnApplyWindowInsetsListener(getBridge().getWebView(), (v, windowInsets) -> {
            int bottomInset = windowInsets.getInsets(WindowInsetsCompat.Type.systemBars()).bottom;
            int extraSpacing = (int) (16 * getResources().getDisplayMetrics().density);
            v.setPadding(v.getPaddingLeft(), v.getPaddingTop(), v.getPaddingRight(), bottomInset + extraSpacing);
            return WindowInsetsCompat.CONSUMED;
        });
    }
}
