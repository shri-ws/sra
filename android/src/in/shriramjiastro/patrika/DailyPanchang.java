package in.shriramjiastro.patrika;

import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.util.Log;

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.Locale;

/**
 * The daily personalised panchang inside the app. A WebView cannot receive web push, so the
 * app wakes itself at 07:00 (device time), asks the server for this subscriber's day
 * (/api/panchang/personalized/today with the id and secret the website got when it
 * subscribed) and shows it as a phone notification. Tapping it opens /aaj-panchang.html.
 */
public class DailyPanchang extends BroadcastReceiver {

    static final String PREFS = "daily_panchang";
    private static final String TAG = "SRADailyPanchang";
    static final String ACTION_ALARM = "in.shriramjiastro.patrika.DAILY_PANCHANG";
    static final String ACTION_TEST = "in.shriramjiastro.patrika.DAILY_PANCHANG_TEST";
    static final String CHANNEL = "daily_panchang";
    static final String OPEN_URL = "https://shriramjiastro.in/aaj-panchang.html";
    private static final int HOUR = 7;
    private static final int RETRY_MINUTES = 20;
    private static final int GIVE_UP_HOUR = 13;   // a morning message is pointless after this

    static SharedPreferences prefs(Context c) {
        return c.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    static boolean isOn(Context c) {
        return prefs(c).getString("id", null) != null;
    }

    static void enable(Context c, String api, String id, String secret) {
        prefs(c).edit().putString("api", api).putString("id", id).putString("secret", secret)
                .remove("last_day").apply();
        createChannel(c);
        schedule(c, nextMorning());
    }

    static void disable(Context c) {
        prefs(c).edit().clear().apply();
        AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
        if (am != null) am.cancel(alarmIntent(c));
    }

    @Override
    public void onReceive(final Context context, Intent intent) {
        final String action = intent.getAction();
        if (!isOn(context)) return;
        if (Intent.ACTION_BOOT_COMPLETED.equals(action) || Intent.ACTION_MY_PACKAGE_REPLACED.equals(action)) {
            schedule(context, sentToday(context) ? nextMorning() : soonOrNextMorning());
            return;
        }
        final boolean test = ACTION_TEST.equals(action);
        if (!test && !ACTION_ALARM.equals(action)) return;
        final PendingResult pending = goAsync();
        new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    if (!test) AppUpdate.notifyIfNewer(context);   // once per new version
                    if (test || !sentToday(context)) {
                        boolean ok = fetchAndNotify(context, test);
                        if (!test) {
                            Calendar now = Calendar.getInstance();
                            if (ok || now.get(Calendar.HOUR_OF_DAY) >= GIVE_UP_HOUR) {
                                schedule(context, nextMorning());
                            } else {
                                now.add(Calendar.MINUTE, RETRY_MINUTES);   // server or network not reachable yet
                                schedule(context, now.getTimeInMillis());
                            }
                        }
                    } else {
                        schedule(context, nextMorning());
                    }
                } finally {
                    pending.finish();
                }
            }
        }).start();
    }

    /** Asks the server for today's message and shows it; false when it could not be fetched. */
    static boolean fetchAndNotify(Context c, boolean test) {
        SharedPreferences p = prefs(c);
        String api = p.getString("api", null), id = p.getString("id", null), secret = p.getString("secret", null);
        if (api == null || id == null || secret == null) {
            Log.w(TAG, "not subscribed in this app");
            return false;
        }
        HttpURLConnection con = null;
        try {
            JSONObject req = new JSONObject();
            req.put("id", id);
            req.put("secret", secret);
            con = (HttpURLConnection) new URL(api + "/api/panchang/personalized/today").openConnection();
            con.setConnectTimeout(30000);
            con.setReadTimeout(90000);         // a sleeping free server takes about a minute
            con.setRequestMethod("POST");
            con.setDoOutput(true);
            con.setRequestProperty("Content-Type", "application/json");
            OutputStream os = con.getOutputStream();
            os.write(req.toString().getBytes("UTF-8"));
            os.close();
            int code = con.getResponseCode();
            if (code == 404) {                 // subscription removed on the server
                disable(c);
                return true;
            }
            Log.i(TAG, "today: HTTP " + code);
            if (code != 200) return false;
            InputStream in = con.getInputStream();
            ByteArrayOutputStream buf = new ByteArrayOutputStream();
            byte[] b = new byte[8192];
            int n;
            while ((n = in.read(b)) > 0) buf.write(b, 0, n);
            in.close();
            JSONObject res = new JSONObject(buf.toString("UTF-8"));
            JSONObject note = res.optJSONObject("notification");
            String title = note != null ? note.optString("title", "") : "";
            String body = note != null ? note.optString("body", "") : "";
            if (title.length() == 0) title = "आज का दैनिक पंचांग";
            if (body.length() == 0) body = "आज का व्यक्तिगत फलादेश तैयार है — देखने के लिए टैप करें।";
            show(c, (test ? "🔔 " : "") + title, body);
            if (!test) p.edit().putString("last_day", today()).apply();
            return true;
        } catch (Exception e) {
            Log.w(TAG, "today failed: " + e);
            return false;
        } finally {
            if (con != null) con.disconnect();
        }
    }

    static void show(Context c, String title, String body) {
        createChannel(c);
        Intent open = new Intent(c, MainActivity.class);
        open.setAction(Intent.ACTION_VIEW);
        open.putExtra(MainActivity.EXTRA_URL, OPEN_URL);
        open.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pi = PendingIntent.getActivity(c, 7, open, PendingIntent.FLAG_UPDATE_CURRENT | immutable());
        Notification.Builder nb = Build.VERSION.SDK_INT >= 26 ? new Notification.Builder(c, CHANNEL) : new Notification.Builder(c);
        nb.setSmallIcon(android.R.drawable.ic_popup_reminder)   // status-bar icons must be one colour
                .setContentTitle(title)
                .setContentText(body)
                .setStyle(new Notification.BigTextStyle().bigText(body))
                .setContentIntent(pi)
                .setAutoCancel(true);
        if (Build.VERSION.SDK_INT < 26) nb.setPriority(Notification.PRIORITY_HIGH).setDefaults(Notification.DEFAULT_ALL);
        NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null) nm.notify(7007, nb.build());
    }

    static void createChannel(Context c) {
        if (Build.VERSION.SDK_INT < 26) return;
        NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null || nm.getNotificationChannel(CHANNEL) != null) return;
        NotificationChannel ch = new NotificationChannel(CHANNEL, "दैनिक पंचांग", NotificationManager.IMPORTANCE_HIGH);
        ch.setDescription("हर सुबह 7 बजे आपका व्यक्तिगत पंचांग");
        nm.createNotificationChannel(ch);
    }

    static void schedule(Context c, long when) {
        AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
        if (am == null) return;
        PendingIntent pi = alarmIntent(c);
        // on time where Android allows exact alarms (most phones up to Android 13); otherwise
        // Android may deliver it up to an hour late
        boolean exact = Build.VERSION.SDK_INT >= 23 && (Build.VERSION.SDK_INT < 31 || am.canScheduleExactAlarms());
        if (exact) am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, when, pi);
        else if (Build.VERSION.SDK_INT >= 23) {
            // an inexact alarm can come up to an hour after its time: aim at 06:40 so it lands near 7
            if (when == nextMorning()) when -= 20 * 60 * 1000L;
            am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, when, pi);
        }
        else am.set(AlarmManager.RTC_WAKEUP, when, pi);
    }

    private static PendingIntent alarmIntent(Context c) {
        Intent i = new Intent(c, DailyPanchang.class);
        i.setAction(ACTION_ALARM);
        return PendingIntent.getBroadcast(c, 70, i, PendingIntent.FLAG_UPDATE_CURRENT | immutable());
    }

    private static int immutable() {
        return Build.VERSION.SDK_INT >= 23 ? PendingIntent.FLAG_IMMUTABLE : 0;
    }

    static long nextMorning() {
        Calendar t = Calendar.getInstance();
        t.set(Calendar.HOUR_OF_DAY, HOUR);
        t.set(Calendar.MINUTE, 0);
        t.set(Calendar.SECOND, 0);
        t.set(Calendar.MILLISECOND, 0);
        if (t.getTimeInMillis() <= System.currentTimeMillis()) t.add(Calendar.DAY_OF_MONTH, 1);
        return t.getTimeInMillis();
    }

    /** After a restart in the morning window, today's message is still due. */
    private static long soonOrNextMorning() {
        Calendar now = Calendar.getInstance();
        int h = now.get(Calendar.HOUR_OF_DAY);
        if (h >= HOUR && h < GIVE_UP_HOUR) return now.getTimeInMillis() + 60000;
        return nextMorning();
    }

    static boolean sentToday(Context c) {
        return today().equals(prefs(c).getString("last_day", ""));
    }

    private static String today() {
        return new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date());
    }
}
