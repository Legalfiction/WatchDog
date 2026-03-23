package nl.barkr.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;

public class BootReceiver extends BroadcastReceiver {

    private static final String TAG             = "BarkrBootReceiver";
    private static final long   BOOT_DELAY_MS   = 10_000; // 10 seconden wachten na boot

    @Override
    public void onReceive(final Context context, Intent intent) {
        String action = intent.getAction();

        if (Intent.ACTION_BOOT_COMPLETED.equals(action)
                || Intent.ACTION_MY_PACKAGE_REPLACED.equals(action)
                || "android.intent.action.QUICKBOOT_POWERON".equals(action)) {

            Log.d(TAG, "Telefoon opgestart — Barkr Service start over " + (BOOT_DELAY_MS/1000) + "s...");

            // Wacht 10 seconden na boot zodat Android volledig
            // klaar is met opstarten voordat we de service starten.
            // Dit voorkomt de 'app stopt' foutmelding.
            new Handler(Looper.getMainLooper()).postDelayed(() -> {
                try {
                    Intent serviceIntent = new Intent(context, BarkrService.class);

                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        context.startForegroundService(serviceIntent);
                    } else {
                        context.startService(serviceIntent);
                    }

                    Log.d(TAG, "✅ Barkr Service succesvol gestart na boot");

                } catch (Exception e) {
                    Log.e(TAG, "❌ Fout bij starten Barkr Service: " + e.getMessage());
                }
            }, BOOT_DELAY_MS);
        }
    }
}
