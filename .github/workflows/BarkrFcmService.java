package nl.barkr.app;

import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.util.Log;

import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

/**
 * BarkrFcmService — ontvangt stille FCM push berichten van de Pi.
 * 
 * De Pi stuurt elke 15 minuten een stille wake-up push.
 * Android levert deze ALTIJD af, ongeacht batterij-instellingen of Doze mode.
 * Bij ontvangst wordt de BarkrService gestart als die niet actief is.
 * 
 * Dit is de officiële Android-manier om apps actief te houden.
 */
public class BarkrFcmService extends FirebaseMessagingService {

    private static final String TAG       = "BarkrFCM";
    private static final String PREFS     = "BarkrPrefs";

    @Override
    public void onMessageReceived(RemoteMessage remoteMessage) {
        Log.d(TAG, "FCM wake-up ontvangen van Pi");

        // Start BarkrService als die niet actief is
        try {
            Intent serviceIntent = new Intent(this, BarkrService.class);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                startForegroundService(serviceIntent);
            } else {
                startService(serviceIntent);
            }
            Log.d(TAG, "✅ BarkrService gestart via FCM wake-up");
        } catch (Exception e) {
            Log.e(TAG, "FCM wake-up start mislukt: " + e.getMessage());
        }
    }

    @Override
    public void onNewToken(String token) {
        Log.d(TAG, "Nieuw FCM token: " + token.substring(0, 20) + "...");

        // Sla FCM token op zodat de Pi het kan gebruiken
        SharedPreferences prefs = getSharedPreferences(PREFS, MODE_PRIVATE);
        prefs.edit().putString("fcm_token", token).apply();

        // Stuur token naar Pi via heartbeat (wordt automatisch meegestuurd)
        Log.d(TAG, "✅ FCM token opgeslagen");
    }
}
