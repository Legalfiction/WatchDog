package nl.barkr.app;

import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.work.Worker;
import androidx.work.WorkerParameters;

/**
 * BarkrWorker — periodieke wake-up via WorkManager.
 * WorkManager wordt door Android gegarandeerd uitgevoerd,
 * ongeacht batterijbesparing of Doze mode.
 */
public class BarkrWorker extends Worker {

    private static final String TAG = "BarkrWorker";

    public BarkrWorker(@NonNull Context context, @NonNull WorkerParameters params) {
        super(context, params);
    }

    @NonNull
    @Override
    public Result doWork() {
        Log.d(TAG, "BarkrWorker wake-up — herstart BarkrService");
        try {
            Context ctx = getApplicationContext();
            Intent intent = new Intent(ctx, BarkrService.class);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                ctx.startForegroundService(intent);
            } else {
                ctx.startService(intent);
            }
        } catch (Exception e) {
            Log.e(TAG, "Wake-up mislukt: " + e.getMessage());
        }
        return Result.success();
    }
}
