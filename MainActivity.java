package nl.barkr.app;

import android.content.SharedPreferences;
import android.os.Build;
import android.os.Bundle;
import android.content.Intent;
import android.util.Log;
import android.webkit.JavascriptInterface;

import com.getcapacitor.BridgeActivity;

import org.json.JSONObject;

public class MainActivity extends BridgeActivity {

    private static final String TAG        = "BarkrMainActivity";
    private static final String PREFS_NAME = "BarkrPrefs";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Registreer de bridge VOOR het laden van de WebView
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
            Log.d(TAG, "BarkrService gestart");
        } catch (Exception e) {
            Log.e(TAG, "Service start fout: " + e.getMessage());
        }
    }

    public class BarkrBridge {

        @JavascriptInterface
        public void updateSettings(String settingsJson) {
            try {
                JSONObject s = new JSONObject(settingsJson);

                String name         = s.optString("name",         "");
                String windowStart  = s.optString("window_start", "00:00");
                String windowEnd    = s.optString("window_end",   "00:00");
                boolean vacationMode = s.optBoolean("vacation_mode", false);

                SharedPreferences.Editor prefs =
                    getSharedPreferences(PREFS_NAME, MODE_PRIVATE).edit();

                prefs.putString("user_name",    name);
                prefs.putString("window_start", windowStart);
                prefs.putString("window_end",   windowEnd);
                prefs.putBoolean("vacation_mode", vacationMode);
                prefs.putString("server_url",   "https://barkr.nl");
                prefs.apply();

                Log.d(TAG, "✅ Bridge: " + name +
                    " | " + windowStart + "–" + windowEnd +
                    " | vacation=" + vacationMode);

            } catch (Exception e) {
                Log.e(TAG, "Bridge fout: " + e.getMessage());
            }
        }

        @JavascriptInterface
        public String getSettings() {
            SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
            try {
                JSONObject r = new JSONObject();
                r.put("name",          prefs.getString("user_name",    ""));
                r.put("window_start",  prefs.getString("window_start", "00:00"));
                r.put("window_end",    prefs.getString("window_end",   "00:00"));
                r.put("vacation_mode", prefs.getBoolean("vacation_mode", false));
                return r.toString();
            } catch (Exception e) {
                return "{}";
            }
        }
    }
}
