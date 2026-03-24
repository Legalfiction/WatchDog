package nl.barkr.app;

import android.content.SharedPreferences;
import android.os.Build;
import android.os.Bundle;
import android.content.Intent;
import android.util.Log;
import android.webkit.JavascriptInterface;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private static final String TAG        = "BarkrMain";
    private static final String PREFS_NAME = "BarkrPrefs";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Registreer bridge zodat App.tsx het telefoonnummer kan opslaan
        getBridge().getWebView().addJavascriptInterface(
            new BarkrBridge(), "BarkrAndroid"
        );

        startBarkrService();
    }

    @Override
    public void onResume() {
        super.onResume();
        startBarkrService();
    }

    private void startBarkrService() {
        try {
            Intent serviceIntent = new Intent(this, BarkrService.class);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                startForegroundService(serviceIntent);
            } else {
                startService(serviceIntent);
            }
        } catch (Exception e) {
            Log.e(TAG, "Service start fout: " + e.getMessage());
        }
    }

    public class BarkrBridge {

        // App.tsx roept dit aan als gebruiker instellingen opslaat
        // Enige doel: telefoonnummer en naam opslaan zodat BarkrService
        // deze kan gebruiken voor de heartbeat naar de Pi
        @JavascriptInterface
        public void saveCredentials(String ownPhone, String userName) {
            SharedPreferences.Editor prefs =
                getSharedPreferences(PREFS_NAME, MODE_PRIVATE).edit();
            prefs.putString("own_phone", ownPhone);
            prefs.putString("user_name", userName);
            prefs.apply();
            Log.d(TAG, "Credentials opgeslagen: " + userName + " (" + ownPhone + ")");
        }

        @JavascriptInterface
        public String getCredentials() {
            SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
            return prefs.getString("own_phone", "") + "|" + prefs.getString("user_name", "");
        }
    }
}
