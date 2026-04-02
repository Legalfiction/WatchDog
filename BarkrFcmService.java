package nl.barkr.app;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.util.Log;

import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

public class BarkrFcmService extends FirebaseMessagingService {

    private static final String TAG   = "BarkrFCM";
    private static final String PREFS = "BarkrPrefs";

    @Override
    public void onMessageReceived(RemoteMessage remoteMessage) {
        Log.d(TAG, "FCM wake-up ontvangen");
        try {
            Intent intent = new Intent(this, BarkrService.class);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                startForegroundService(intent);
            } else {
                startService(intent);
            }
        } catch (Exception e) {
            Log.e(TAG, "Start mislukt: " + e.getMessage());
        }
    }

    @Override
    public void onNewToken(String token) {
        Log.d(TAG, "Nieuw FCM token ontvangen");
        SharedPreferences prefs = getApplicationContext()
            .getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        prefs.edit().putString("fcm_token", token).apply();
    }

    public static void fetchAndStoreToken(Context context) {
        com.google.firebase.messaging.FirebaseMessaging.getInstance().getToken()
            .addOnCompleteListener(task -> {
                if (task.isSuccessful() && task.getResult() != null) {
                    String token = task.getResult();
                    context.getSharedPreferences("BarkrPrefs", Context.MODE_PRIVATE)
                        .edit().putString("fcm_token", token).apply();
                    Log.d("BarkrFCM", "FCM token opgeslagen");
                }
            });
    }
}
