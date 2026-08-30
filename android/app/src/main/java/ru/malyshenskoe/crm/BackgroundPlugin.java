package ru.malyshenskoe.crm;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "Background")
public class BackgroundPlugin extends Plugin {

    private SharedPreferences prefs() {
        return getContext().getSharedPreferences(MessagePoller.PREFS, Context.MODE_PRIVATE);
    }

    @PluginMethod
    public void start(PluginCall call) {
        String token = call.getString("token", "");
        boolean club = Boolean.TRUE.equals(call.getBoolean("club", false));

        if (token == null || token.isEmpty()) {
            call.reject("Нет токена");
            return;
        }

        prefs().edit()
                .putString(MessagePoller.KEY_TOKEN, token)
                .putBoolean(MessagePoller.KEY_CLUB, club)
                .apply();

        Context ctx = getContext();
        Intent svc = new Intent(ctx, MessageService.class);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            ctx.startForegroundService(svc);
        } else {
            ctx.startService(svc);
        }
        call.resolve();
    }

    @PluginMethod
    public void stop(PluginCall call) {
        Context ctx = getContext();
        Intent svc = new Intent(ctx, MessageService.class);
        svc.setAction("STOP");
        ctx.startService(svc);
        prefs().edit().remove(MessagePoller.KEY_TOKEN).apply();
        call.resolve();
    }

    @PluginMethod
    public void syncSeen(PluginCall call) {
        Integer total = call.getInt("total", 0);
        MessagePoller.resetSeen(getContext(), total == null ? 0 : total);
        call.resolve();
    }

    @PluginMethod
    public void batterySettings(PluginCall call) {
        Activity act = getActivity();
        if (act == null) {
            call.reject("Нет активности");
            return;
        }
        try {
            Intent i = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
            i.setData(Uri.parse("package:" + getContext().getPackageName()));
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            act.startActivity(i);
            call.resolve();
        } catch (Exception e) {
            call.reject("Не удалось открыть настройки");
        }
    }

    @PluginMethod
    public void status(PluginCall call) {
        JSObject res = new JSObject();
        String token = prefs().getString(MessagePoller.KEY_TOKEN, "");
        res.put("running", token != null && !token.isEmpty());
        call.resolve(res);
    }
}
