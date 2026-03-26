package nl.barkr.app;

import android.app.KeyguardManager;
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
    private static final long   PING_INTERVAL   = 20_000;
    private static final String APP_KEY         = "BARKR_SECURE_V1";
    private static final String SERVER_URL      = "https://barkr.nl";
    private static final String PREFS_NAME      = "BarkrPrefs";

    private Handler               handler;
    private Runnable              pingRunnable;
    private boolean               isRunning = false;
    private PowerManager.WakeLock wakeLock;

    @Override
    public void onCreate() {
        super.onCreate();
        handler = new Handler(Looper.getMainLooper());
        createNotificationChannel();
        PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
        wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "BarkrApp::WakeLock");
        wakeLock.acquire();
        Log.d(TAG, "BarkrService gestart");
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        try {
            startForeground(NOTIFICATION_ID, buildNotification());
        } catch (Exception e) {
            Log.e(TAG, "startForeground fout: " + e.getMessage());
        }
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
        if (wakeLock != null && wakeLock.isHeld()) {
            wakeLock.release();
        }
    }

    private void startPingLoop() {
        pingRunnable = new Runnable() {
            @Override
            public void run() {
                if (isRunning) {
                    sendHeartbeat();
                    handler.postDelayed(this, PING_INTERVAL);
                }
            }
        };
        handler.post(pingRunnable);
    }

    private void sendHeartbeat() {
        new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
                    // Gebruik device_id als unieke sleutel - nooit telefoonnummer
                    String deviceId = prefs.getString("device_id", "");
                    if (deviceId.isEmpty()) {
                        deviceId = java.util.UUID.randomUUID().toString().replace("-", "");
                        prefs.edit().putString("device_id", deviceId).apply();
                        Log.d(TAG, "Nieuwe device_id aangemaakt: " + deviceId);
                    }
                    String userName = prefs.getString("user_name", "");

                    // Controleer of toestel vergrendeld is
                    KeyguardManager km = (KeyguardManager) getSystemService(Context.KEYGUARD_SERVICE);
                    boolean isLocked = (km != null && km.isKeyguardLocked());
                    String deviceStatus = isLocked ? "locked" : "unlocked";

                    JSONObject payload = new JSONObject();
                    payload.put("device_id",     deviceId);
                    payload.put("name",          userName);
                    payload.put("app_key",       APP_KEY);
                    payload.put("secret",        APP_KEY);
                    payload.put("source",        "background_service");
                    payload.put("device_status", deviceStatus);
                    // own_phone optioneel - alleen voor meldingen aan gebruiker zelf
                    String ownPhone = prefs.getString("own_phone", "");
                    if (!ownPhone.isEmpty()) payload.put("own_phone", ownPhone);

                    URL url = new URL(SERVER_URL + "/heartbeat");
                    HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                    conn.setRequestMethod("POST");
                    conn.setRequestProperty("Content-Type", "application/json");
                    conn.setDoOutput(true);
                    conn.setConnectTimeout(10000);
                    conn.setReadTimeout(10000);

                    byte[] body = payload.toString().getBytes(StandardCharsets.UTF_8);
                    OutputStream os = conn.getOutputStream();
                    os.write(body);
                    os.close();

                    int code = conn.getResponseCode();
                    conn.disconnect();

                    Log.d(TAG, "Ping OK: " + deviceStatus + " | " + deviceId.substring(0,8) + " | HTTP " + code);

                } catch (Exception e) {
                    Log.w(TAG, "Ping mislukt: " + e.getMessage());
                }
            }
        }).start();
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID, "Barkr Bewaking", NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Barkr bewaakt je welzijn op de achtergrond");
            channel.setShowBadge(false);
            channel.enableVibration(false);
            channel.enableLights(false);
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) manager.createNotificationChannel(channel);
        }
    }

    private Notification buildNotification() {
        Intent intent = new Intent(this, MainActivity.class);
        PendingIntent pendingIntent = PendingIntent.getActivity(
            this, 0, intent, PendingIntent.FLAG_IMMUTABLE
        );
        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Barkr is waakzaam")
            .setContentText("Digitale waakhond actief")
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setSilent(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build();
    }
}
