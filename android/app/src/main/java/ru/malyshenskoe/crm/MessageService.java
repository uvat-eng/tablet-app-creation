package ru.malyshenskoe.crm;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;

public class MessageService extends Service {

    private static final String CH_QUIET = "hb_service";
    private static final String CH_ALERT = "hb_messages";
    private static final int ID_QUIET = 101;
    private static final int ID_ALERT = 202;

    private static final long PERIOD_MS = 60000L;

    private final Handler handler = new Handler(Looper.getMainLooper());
    private Thread worker;
    private boolean running = false;

    private final Runnable tick = new Runnable() {
        @Override
        public void run() {
            poll();
            handler.postDelayed(this, PERIOD_MS);
        }
    };

    private void channels() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager nm = getSystemService(NotificationManager.class);
        if (nm == null) return;

        NotificationChannel quiet = new NotificationChannel(
                CH_QUIET, "Работа в фоне", NotificationManager.IMPORTANCE_MIN);
        quiet.setDescription("Служебное уведомление, чтобы приложение получало сообщения");
        quiet.setShowBadge(false);
        nm.createNotificationChannel(quiet);

        NotificationChannel alert = new NotificationChannel(
                CH_ALERT, "Новые сообщения", NotificationManager.IMPORTANCE_HIGH);
        alert.setDescription("Сообщения из переписки и чата клуба");
        alert.enableVibration(true);
        nm.createNotificationChannel(alert);
    }

    private PendingIntent openApp() {
        Intent i = new Intent(this, MainActivity.class);
        i.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }
        return PendingIntent.getActivity(this, 0, i, flags);
    }

    private Notification quietNote() {
        Notification.Builder b = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                ? new Notification.Builder(this, CH_QUIET)
                : new Notification.Builder(this);
        return b.setContentTitle("Малышенское")
                .setContentText("Ожидание новых сообщений")
                .setSmallIcon(android.R.drawable.ic_dialog_email)
                .setContentIntent(openApp())
                .setOngoing(true)
                .setPriority(Notification.PRIORITY_MIN)
                .build();
    }

    private void alert(int fresh, int personal, int club) {
        NotificationManager nm = getSystemService(NotificationManager.class);
        if (nm == null) return;

        String text;
        if (personal > 0 && club > 0) {
            text = "Личных: " + personal + " · в чате клуба: " + club;
        } else if (club > 0) {
            text = club == 1 ? "Новое сообщение в чате клуба"
                    : "В чате клуба новых: " + club;
        } else {
            text = personal == 1 ? "Новое личное сообщение"
                    : "Новых личных сообщений: " + personal;
        }

        Notification.Builder b = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                ? new Notification.Builder(this, CH_ALERT)
                : new Notification.Builder(this);

        Notification n = b.setContentTitle("Малышенское")
                .setContentText(text)
                .setSmallIcon(android.R.drawable.ic_dialog_email)
                .setContentIntent(openApp())
                .setAutoCancel(true)
                .setDefaults(Notification.DEFAULT_ALL)
                .setPriority(Notification.PRIORITY_HIGH)
                .setNumber(fresh)
                .build();

        nm.notify(ID_ALERT, n);
    }

    private void poll() {
        if (worker != null && worker.isAlive()) return;
        worker = new Thread(() -> {
            final Context ctx = getApplicationContext();
            final MessagePoller.Result r = MessagePoller.check(ctx);
            if (r.fresh > 0) {
                handler.post(() -> alert(r.fresh, r.personal, r.club));
            }
        });
        worker.start();
    }

    @Override
    public void onCreate() {
        super.onCreate();
        channels();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && "STOP".equals(intent.getAction())) {
            running = false;
            handler.removeCallbacks(tick);
            stopForeground(true);
            stopSelf();
            return START_NOT_STICKY;
        }

        startForeground(ID_QUIET, quietNote());

        if (!running) {
            running = true;
            handler.post(tick);
        }
        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        running = false;
        handler.removeCallbacks(tick);
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
