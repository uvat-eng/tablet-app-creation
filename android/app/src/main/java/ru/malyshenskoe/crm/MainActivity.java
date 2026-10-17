package ru.malyshenskoe.crm;

import android.content.SharedPreferences;
import android.os.Build;
import android.os.Bundle;
import android.webkit.ServiceWorkerClient;
import android.webkit.ServiceWorkerController;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;

import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(ImmersivePlugin.class);
        registerPlugin(BackgroundPlugin.class);
        routeServiceWorker();
        super.onCreate(savedInstanceState);
        clearCacheOnUpdate();
    }

    private void routeServiceWorker() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.N) {
            return;
        }
        try {
            ServiceWorkerController.getInstance().setServiceWorkerClient(new ServiceWorkerClient() {
                @Override
                public WebResourceResponse shouldInterceptRequest(WebResourceRequest request) {
                    Bridge bridge = getBridge();
                    if (bridge == null || bridge.getLocalServer() == null) {
                        return null;
                    }
                    return bridge.getLocalServer().shouldInterceptRequest(request);
                }
            });
        } catch (Exception ignored) {
            // телефон не поддерживает служебные файлы
        }
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
