package nl.barkr.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;
import android.util.Log;

import androidx.core.app.NotificationCompat;

import org.json.JSONObject;

import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

public class BarkrService extends Service {

    private static final String TAG             = "BarkrService";
    private static final String CHANNEL_ID      = "barkr_foreground";
    private static final int    NOTIFICATION_ID = 1001;
    private static final long   PING_INTERVAL   = 60_000;
    private static final String APP_KEY         = "BARKR_SECURE_V1";
    private static final String PREFS_NAME      = "BarkrPrefs";

    private Handler           handler;
    private Runnable          pingRunnable;
    private boolean           isRunning = false;
    private PowerManager.WakeLock wakeLock;

    @Override
    public void onCreate() {
        super.onCreate();
        handler = new Handler(Looper.getMainLooper());
        createNotificationChannel();

        // Wake lock voorkomt dat Android de CPU sloopt en de service killt
        PowerManager powerManager = (PowerManager) getSystemService(Context.POWER_SERVICE);
        wakeLock = powerManager.newWakeLock(
            PowerManager.PARTIAL_WAKE_LOCK,
            "BarkrApp::BarkrWakeLock"
        );
        wakeLock.acquire();
        Log.d(TAG, "✅ WakeLock verkregen");
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        Log.d(TAG, "BarkrService gestart");

        try {
            startForeground(NOTIFICATION_ID, buildNotification());
        } catch (Exception e) {
            Log.e(TAG, "startForeground fout: " + e.getMessage());
        }

        if (!isRunning) {
            isRunning = true;
            startPingLoop();
        }

        // START_STICKY herstart de service automatisch als Android hem toch killt
        return START_STICKY;
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        isRunning = false;

        if (handler != null && pingRunnable != null) {
            handler.removeCallbacks(pingRunnable);
        }

        // Geef wake lock vrij
        if (wakeLock != null && wakeLock.isHeld()) {
            wakeLock.release();
            Log.d(TAG, "WakeLock vrijgegeven");
        }

        // Herstart de service onmiddellijk als hij gestopt wordt
        Intent restartIntent = new Intent(getApplicationContext(), BarkrService.class);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(restartIntent);
        } else {
            startService(restartIntent);
        }
        Log.d(TAG, "Service herstart na onDestroy");
    }

    private void startPingLoop() {
        pingRunnable = new Runnable() {
            @Override
            public void run() {
                if (isRunning) {
                    sendPingInBackground();
                    handler.postDelayed(this, PING_INTERVAL);
                }
            }
        };
        handler.post(pingRunnable);
    }

    private void sendPingInBackground() {
        new Thread(() -> {
            try {
                SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
                String  userName     = prefs.getString("user_name",    "");
                String  serverUrl    = prefs.getString("server_url",    "https://barkr.nl");
                String  windowStart  = prefs.getString("window_start",  "00:00");
                String  windowEnd    = prefs.getString("window_end",    "00:00");
                boolean vacationMode = prefs.getBoolean("vacation_mode", false);

                if (userName.isEmpty() || vacationMode) return;

                JSONObject activeWindow = new JSONObject();
                activeWindow.put("start", windowStart);
                activeWindow.put("end",   windowEnd);

                JSONObject payload = new JSONObject();
                payload.put("name",          userName);
                payload.put("app_key",       APP_KEY);
                payload.put("secret",        APP_KEY);
                payload.put("active_window", activeWindow);

                URL url = new URL(serverUrl + "/ping");
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("POST");
                conn.setRequestProperty("Content-Type", "application/json");
                conn.setDoOutput(true);
                conn.setConnectTimeout(10_000);
                conn.setReadTimeout(10_000);

                byte[] body = payload.toString().getBytes(StandardCharsets.UTF_8);
                try (OutputStream os = conn.getOutputStream()) {
                    os.write(body);
                }

                int code = conn.getResponseCode();
                conn.disconnect();
                Log.d(TAG, "Ping → " + userName + " | HTTP " + code);

            } catch (Exception e) {
                Log.w(TAG, "Ping mislukt: " + e.getMessage());
            }
        }).start();
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Barkr Bewaking",
                NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Barkr bewaakt je welzijn op de achtergrond");
            channel.setShowBadge(false);
            channel.enableVibration(false);
            channel.enableLights(false);

            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }

    private Notification buildNotification() {
        Intent notificationIntent = new Intent(this, MainActivity.class);
        PendingIntent pendingIntent = PendingIntent.getActivity(
            this, 0, notificationIntent,
            PendingIntent.FLAG_IMMUTABLE
        );

        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Barkr is waakzaam")
            .setContentText("Digitale waakhond actief")
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setSilent(true)
            .setOnlyAlertOnce(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build();
    }
}
