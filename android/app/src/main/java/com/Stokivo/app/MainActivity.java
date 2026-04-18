package com.Stokivo.app;

import android.os.Bundle;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Enable edge-to-edge layout
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);

        // Handle window insets for the root view
        ViewCompat.setOnApplyWindowInsetsListener(getBridge().getWebView(), (v, windowInsets) -> {
            // Get system bar insets
            int bottomInset = windowInsets.getInsets(WindowInsetsCompat.Type.systemBars()).bottom;

            // Apply bottom padding to WebView to account for system navigation bar
            // Add extra 16dp for better UX spacing
            int extraSpacing = (int) (16 * getResources().getDisplayMetrics().density);
            v.setPadding(v.getPaddingLeft(), v.getPaddingTop(), v.getPaddingRight(), bottomInset + extraSpacing);

            // Return consumed insets
            return WindowInsetsCompat.CONSUMED;
        });
    }
}
