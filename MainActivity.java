package nl.barkr.app;

import android.content.SharedPreferences;
import android.os.Build;
import android.os.Bundle;
import android.content.Intent;
import android.util.Log;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import android.net.Uri;

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
        requestBatteryOptimizationExemption();
    }

    private void requestBatteryOptimizationExemption() {
        // Vraag gebruiker om batterijoptimalisatie uit te zetten via officieel Android dialoog
        // Dit werkt op ALLE Android telefoons inclusief Motorola, Samsung, Xiaomi
        try {
            android.os.PowerManager pm = (android.os.PowerManager) getSystemService(POWER_SERVICE);
            if (pm != null && !pm.isIgnoringBatteryOptimizations(getPackageName())) {
                android.content.Intent intent = new android.content.Intent(
                    android.provider.Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS
                );
                intent.setData(android.net.Uri.parse("package:" + getPackageName()));
                startActivity(intent);
                Log.d(TAG, "✅ Batterijoptimalisatie dialoog getoond");
            } else {
                Log.d(TAG, "✅ Batterijoptimalisatie al uitgeschakeld");
            }
        } catch (Exception e) {
            Log.e(TAG, "Batterijoptimalisatie aanvraag mislukt: " + e.getMessage());
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        startBarkrService();
    }

    @Override
    public void onBackPressed() {
        // Als de WebView terug kan navigeren, doe dat dan
        WebView webView = getBridge().getWebView();
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            // Anders: sluit de app (naar achtergrond, service blijft draaien)
            moveTaskToBack(true);
        }
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
            SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
            SharedPreferences.Editor editor = prefs.edit();
            // Genereer device_id als die nog niet bestaat
            String deviceId = prefs.getString("device_id", "");
            if (deviceId.isEmpty()) {
                deviceId = java.util.UUID.randomUUID().toString().replace("-", "");
                editor.putString("device_id", deviceId);
                Log.d(TAG, "Nieuwe device_id: " + deviceId);
            }
            editor.putString("own_phone", ownPhone);
            editor.putString("user_name", userName);
            editor.apply();
            Log.d(TAG, "Credentials opgeslagen: " + userName + " device:" + deviceId.substring(0,8));
        }

        @JavascriptInterface
        public String getCredentials() {
            SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
            String deviceId = prefs.getString("device_id", "");
            return prefs.getString("own_phone", "") + "|" + prefs.getString("user_name", "") + "|" + deviceId;
        }
    }
}
