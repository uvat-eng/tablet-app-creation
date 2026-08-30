package ru.malyshenskoe.crm;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;

public class BootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context ctx, Intent intent) {
        if (intent == null || intent.getAction() == null) return;
        String a = intent.getAction();
        if (!Intent.ACTION_BOOT_COMPLETED.equals(a)
                && !"android.intent.action.QUICKBOOT_POWERON".equals(a)) {
            return;
        }

        SharedPreferences p =
                ctx.getSharedPreferences(MessagePoller.PREFS, Context.MODE_PRIVATE);
        String token = p.getString(MessagePoller.KEY_TOKEN, "");
        if (token == null || token.isEmpty()) return;

        Intent svc = new Intent(ctx, MessageService.class);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            ctx.startForegroundService(svc);
        } else {
            ctx.startService(svc);
        }
    }
}
