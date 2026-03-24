package nl.barkr.app;

import android.content.SharedPreferences;
import android.os.Build;
import android.os.Bundle;
import android.content.Intent;
import android.util.Log;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;

import org.json.JSONObject;

public class MainActivity extends BridgeActivity {

    private static final String TAG        = "BarkrMainActivity";
    private static final String PREFS_NAME = "BarkrPrefs";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        startBarkrService();

        // Voeg JavaScript interface toe zodat de WebApp
        // instellingen kan doorgeven aan de BarkrService
        getBridge().getWebView().addJavascriptInterface(
            new BarkrBridge(), "BarkrAndroid"
        );
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

    // ----------------------------------------------------------------
    //  BRIDGE: JavaScript → SharedPreferences → BarkrService
    //
    //  De WebApp roept window.BarkrAndroid.updateSettings(json) aan
    //  bij elke wijziging van instellingen of tijdvenster.
    //  De BarkrService leest deze SharedPreferences voor elke ping.
    // ----------------------------------------------------------------
    public class BarkrBridge {

        @JavascriptInterface
        public void updateSettings(String settingsJson) {
            try {
                JSONObject settings = new JSONObject(settingsJson);

                SharedPreferences.Editor prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE).edit();

                // Gebruikersnaam
                prefs.putString("user_name", settings.optString("name", ""));

                // Tijdvenster van vandaag
                prefs.putString("window_start", settings.optString("window_start", "00:00"));
                prefs.putString("window_end",   settings.optString("window_end",   "00:00"));

                // Vacation mode
                prefs.putBoolean("vacation_mode", settings.optBoolean("vacation_mode", false));

                // Server URL
                prefs.putString("server_url", "https://barkr.nl");

                prefs.apply();

                Log.d(TAG, "✅ SharedPreferences bijgewerkt: " +
                    settings.optString("name") + " | " +
                    settings.optString("window_start") + "–" +
                    settings.optString("window_end"));

            } catch (Exception e) {
                Log.e(TAG, "Bridge fout: " + e.getMessage());
            }
        }

        @JavascriptInterface
        public String getSettings() {
            // Geeft huidige instellingen terug aan de WebApp
            SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
            try {
                JSONObject result = new JSONObject();
                result.put("name",         prefs.getString("user_name",    ""));
                result.put("window_start", prefs.getString("window_start", "00:00"));
                result.put("window_end",   prefs.getString("window_end",   "00:00"));
                result.put("vacation_mode", prefs.getBoolean("vacation_mode", false));
                return result.toString();
            } catch (Exception e) {
                return "{}";
            }
        }
    }
}
