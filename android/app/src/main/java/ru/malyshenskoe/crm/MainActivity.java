package ru.malyshenskoe.crm;

import android.content.SharedPreferences;
import android.os.Bundle;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(ImmersivePlugin.class);
        registerPlugin(BackgroundPlugin.class);
        super.onCreate(savedInstanceState);
        clearCacheOnUpdate();
    }

    private void clearCacheOnUpdate() {
        SharedPreferences prefs = getSharedPreferences("app_state", MODE_PRIVATE);
        int saved = prefs.getInt("build_version", -1);
        int current = currentVersionCode();
        if (saved == current) {
            return;
        }

        WebView view = getBridge() != null ? getBridge().getWebView() : null;
        if (view != null) {
            view.clearCache(true);
            view.clearHistory();
        }
        prefs.edit().putInt("build_version", current).apply();
    }

    private int currentVersionCode() {
        try {
            return (int) getPackageManager()
                    .getPackageInfo(getPackageName(), 0).getLongVersionCode();
        } catch (Exception e) {
            return -1;
        }
    }
}