package nl.barkr.app;

import android.os.Build;
import android.os.Bundle;
import android.content.Intent;
import android.util.Log;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private static final String TAG = "BarkrMainActivity";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        startBarkrService();
    }

    @Override
    protected void onResume() {
        super.onResume();
        // Zorg dat de service ook herstart als de app weer naar voorgrond komt
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
            Log.d(TAG, "✅ BarkrService gestart vanuit MainActivity");
        } catch (Exception e) {
            Log.e(TAG, "❌ Kon BarkrService niet starten: " + e.getMessage());
        }
    }
}
