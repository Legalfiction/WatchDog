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
            Log.d(TAG, "✅ BarkrService gestart vanuit MainActivity");
        } catch (Exception e) {
            Log.e(TAG, "❌ Kon BarkrService niet starten: " + e.getMessage());
        }
    }
}
