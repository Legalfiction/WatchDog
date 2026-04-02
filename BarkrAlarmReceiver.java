package nl.barkr.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.util.Log;

public class BarkrAlarmReceiver extends BroadcastReceiver {

    private static final String TAG = "BarkrAlarm";

    @Override
    public void onReceive(Context context, Intent intent) {
        Log.d(TAG, "AlarmManager wake-up ontvangen");
        try {
            Intent serviceIntent = new Intent(context, BarkrService.class);
            serviceIntent.putExtra("wakeup_source", "AlarmManager");
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent);
            } else {
                context.startService(serviceIntent);
            }
        } catch (Exception e) {
            Log.e(TAG, "AlarmManager herstart mislukt: " + e.getMessage());
        }
    }
}
