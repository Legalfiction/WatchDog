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

    // ----------------------------------------------------------------
    //  PRODUCTIE INSTELLINGEN
    //
    //  De BarkrService draait op de achtergrond als vangnet.
    //  De WebView (App.tsx) stuurt direct een ping bij elke
    //  visibilitychange naar voorgrond — dat vangt korte bezoeken op.
    //
    //  Achtergrond interval: 60 seconden
    //  Server timeout:       90 seconden (zie pi_backend.py)
    //
    //  Scenario: gebruiker kijkt 5 seconden naar de app:
    //  1. App opent → WebView vuurt direct ping (< 1 seconde) ✅
    //  2. App sluit → BarkrService continueert achtergrond pings
    //  3. Server ontvangt ping → last_ping_time bijgewerkt ✅
    // ----------------------------------------------------------------
    private static final long   PING_INTERVAL_MS = 60_000; // 60 seconden achtergrond
    private static final String APP_KEY          = "BARKR_SECURE_V1";
    private static final String PREFS_NAME       = "BarkrPrefs";

    private Handler  handler;
    private Runnable pingRunnable;
    private boolean  isRunning = false;

    @Override
    public void onCreate() {
        super.onCreate();
        handler = new Handler(Looper.getMainLooper());
        createNotificationChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        Log.d(TAG, "Barkr Foreground Service gestart");
        startForeground(NOTIFICATION_ID, buildNotification());

        if (!isRunning) {
            isRunning = true;
            startPingLoop();
        }

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
        Log.d(TAG, "Barkr Service gestopt");
    }

    // ----------------------------------------------------------------
    //  PING LOOP
    //  Direct ping bij start, daarna elke 60 seconden.
    //  De WebView (visibilitychange) vangt korte app-bezoeken op.
    // ----------------------------------------------------------------

    private void startPingLoop() {
        pingRunnable = new Runnable() {
            @Override
            public void run() {
                if (isRunning) {
                    sendPingInBackground();
                    handler.postDelayed(this, PING_INTERVAL_MS);
                }
            }
        };
        // Stuur direct een ping bij het starten van de service
        // Dit registreert ook een herstart van de telefoon
        handler.post(pingRunnable);
    }

    private void sendPingInBackground() {
        new Thread(() -> {
            try {
                SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
                String  userName     = prefs.getString("user_name",    "");
                String  serverUrl    = prefs.getString("server_url",    "https://barkr.nl");
                String  windowStart  = prefs.getString("window_start",  "06:00");
                String  windowEnd    = prefs.getString("window_end",    "10:00");
                boolean vacationMode = prefs.getBoolean("vacation_mode", false);

                if (userName.isEmpty() || vacationMode) {
                    Log.d(TAG, "Ping overgeslagen: naam leeg of vakantie-modus actief");
                    return;
                }

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

                int responseCode = conn.getResponseCode();
                conn.disconnect();

                Log.d(TAG, "✅ Achtergrond ping → " + userName +
                           " | Venster: " + windowStart + "–" + windowEnd +
                           " | HTTP " + responseCode);

            } catch (Exception e) {
                Log.w(TAG, "Ping mislukt (netwerk?): " + e.getMessage());
            }
        }).start();
    }

    // ----------------------------------------------------------------
    //  NOTIFICATIE
    // ----------------------------------------------------------------

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Barkr Bewaking",
                NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Barkr bewaakt actief je welzijn op de achtergrond");
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
            .setContentText("Digitale waakhond actief — tik om te openen")
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setSilent(true)
            .setOnlyAlertOnce(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build();
    }
}
