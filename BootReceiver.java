package nl.barkr.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;

public class BootReceiver extends BroadcastReceiver {

    private static final String TAG           = "BarkrBootReceiver";
    private static final long   BOOT_DELAY_MS = 15_000; // 15 seconden wachten

    @Override
    public void onReceive(final Context context, Intent intent) {
        String action = intent.getAction();
        if (action == null) return;

        if (Intent.ACTION_BOOT_COMPLETED.equals(action)
                || Intent.ACTION_MY_PACKAGE_REPLACED.equals(action)
                || "android.intent.action.QUICKBOOT_POWERON".equals(action)) {

            Log.d(TAG, "Boot ontvangen — service start over " + (BOOT_DELAY_MS/1000) + "s");

            // Gebruik een goedaardig wekker-alarm in plaats van direct starten
            // Dit is compatibel met Android 14+ beperkingen op boot starts
            new Handler(Looper.getMainLooper()).postDelayed(() -> {
                try {
                    Intent serviceIntent = new Intent(context, BarkrService.class);
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        context.startForegroundService(serviceIntent);
                    } else {
                        context.startService(serviceIntent);
                    }
                    Log.d(TAG, "✅ BarkrService gestart na boot");
                } catch (Exception e) {
                    Log.e(TAG, "❌ Boot start mislukt: " + e.getMessage());
                    // Probeer nogmaals na 30 seconden als eerste poging mislukt
                    new Handler(Looper.getMainLooper()).postDelayed(() -> {
                        try {
                            Intent retryIntent = new Intent(context, BarkrService.class);
                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                                context.startForegroundService(retryIntent);
                            } else {
                                context.startService(retryIntent);
                            }
                            Log.d(TAG, "✅ BarkrService gestart na retry");
                        } catch (Exception ex) {
                            Log.e(TAG, "❌ Retry ook mislukt: " + ex.getMessage());
                        }
                    }, 30_000);
                }
            }, BOOT_DELAY_MS);
        }
    }
}
