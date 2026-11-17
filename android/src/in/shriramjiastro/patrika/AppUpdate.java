package in.shriramjiastro.patrika;

import android.app.Activity;
import android.app.AlertDialog;
import android.app.Notification;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Build;
import android.util.Log;
import android.widget.Toast;

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

/**
 * Updates the app from the website. build_apk.sh publishes app-version.json next to the APK;
 * the app compares it with its own version on start (and with the daily alarm), offers the
 * update and opens the APK in the phone's browser; Android then asks to confirm "Update".
 * Most changes need none of this: the app shows the live website, so they appear by themselves.
 */
public class AppUpdate {

    // the website first, GitHub's copy of the same file if the site cannot be reached
    static final String[] VERSION_URLS = {
            "https://shriramjiastro.in/app-version.json",
            "https://raw.githubusercontent.com/shri-ws/sra/main/app-version.json"};
    private static final String TAG = "SRAAppUpdate";
    private static final String PREFS = "app_update";
    private static final int NOTE_ID = 7008;

    static class Info {
        int code;
        String name, apk, notes;
    }

    static int myVersion(Context c) {
        try {
            return c.getPackageManager().getPackageInfo(c.getPackageName(), 0).versionCode;
        } catch (Exception e) {
            return 0;
        }
    }

    /** The published version, or null when it cannot be read; runs on a background thread. */
    static Info fetch() {
        for (String u : VERSION_URLS) {
            Info i = fetch(u);
            if (i != null) return i;
        }
        return null;
    }

    private static Info fetch(String url) {
        HttpURLConnection con = null;
        try {
            con = (HttpURLConnection) new URL(url + "?t=" + System.currentTimeMillis()).openConnection();
            con.setConnectTimeout(15000);
            con.setReadTimeout(15000);
            con.setUseCaches(false);
            if (con.getResponseCode() != 200) return null;
            InputStream in = con.getInputStream();
            ByteArrayOutputStream buf = new ByteArrayOutputStream();
            byte[] b = new byte[4096];
            int n;
            while ((n = in.read(b)) > 0) buf.write(b, 0, n);
            in.close();
            JSONObject j = new JSONObject(buf.toString("UTF-8"));
            Info i = new Info();
            i.code = j.optInt("versionCode", 0);
            i.name = j.optString("versionName", "");
            i.apk = j.optString("apk", "");
            i.notes = j.optString("notes", "");
            return i.apk.startsWith("https://") ? i : null;
        } catch (Exception e) {
            Log.w(TAG, "version check failed: " + e);
            return null;
        } finally {
            if (con != null) con.disconnect();
        }
    }

    /** Checks and, if newer, offers the update. quiet: say nothing when already up to date. */
    static void check(final Activity a, final boolean quiet) {
        new Thread(new Runnable() {
            @Override
            public void run() {
                final Info i = fetch();
                a.runOnUiThread(new Runnable() {
                    @Override
                    public void run() {
                        if (a.isFinishing()) return;
                        if (i == null) {
                            if (!quiet) Toast.makeText(a, "अपडेट की जानकारी नहीं मिल सकी — इंटरनेट जाँचें।", Toast.LENGTH_LONG).show();
                        } else if (i.code > myVersion(a)) {
                            offer(a, i);
                        } else if (!quiet) {
                            Toast.makeText(a, "✅ ऐप नवीनतम है।", Toast.LENGTH_SHORT).show();
                        }
                    }
                });
            }
        }).start();
    }

    static void offer(final Activity a, final Info i) {
        String msg = "नया संस्करण " + i.name + " उपलब्ध है।" + (i.notes.length() > 0 ? "\n\n" + i.notes : "")
                + "\n\nआपकी कुण्डलियाँ और सेटिंग बनी रहेंगी।";
        new AlertDialog.Builder(a)
                .setTitle("🔄 ऐप अपडेट")
                .setMessage(msg)
                .setPositiveButton("अभी अपडेट करें", new android.content.DialogInterface.OnClickListener() {
                    @Override
                    public void onClick(android.content.DialogInterface d, int w) {
                        start(a, i);
                    }
                })
                .setNegativeButton("बाद में", null)
                .show();
    }

    /**
     * Opens the new APK in the phone's browser, which downloads it; opening the file installs
     * the update. The app itself does not install apps: that permission makes Play Protect
     * call an app harmful, so the browser (which already has it) does that part.
     */
    static void start(Activity a, Info i) {
        try {
            Intent view = new Intent(Intent.ACTION_VIEW, Uri.parse(i.apk + "?v=" + i.name));
            view.addCategory(Intent.CATEGORY_BROWSABLE);
            a.startActivity(view);
            Toast.makeText(a, "⬇️ डाउनलोड पूरा होने पर फ़ाइल खोलकर \"Update\" दबाएँ।", Toast.LENGTH_LONG).show();
        } catch (Exception e) {
            Toast.makeText(a, "ब्राउज़र नहीं खुल सका।", Toast.LENGTH_LONG).show();
        }
    }

    /** From the daily alarm (no screen): tell about a new version once, by notification. */
    static void notifyIfNewer(Context c) {
        Info i = fetch();
        if (i == null || i.code <= myVersion(c)) return;
        SharedPreferences p = prefs(c);
        if (p.getInt("told_version", 0) >= i.code) return;
        p.edit().putInt("told_version", i.code).apply();
        Intent open = new Intent(c, MainActivity.class);
        open.setAction(Intent.ACTION_VIEW);
        open.putExtra(MainActivity.EXTRA_CHECK_UPDATE, true);
        open.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        note(c, "ऐप का नया संस्करण " + i.name + " — अपडेट करने के लिए टैप करें",
                PendingIntent.getActivity(c, 9, open, PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= 23 ? PendingIntent.FLAG_IMMUTABLE : 0)));
    }

    private static void note(Context c, String text, PendingIntent pi) {
        DailyPanchang.createChannel(c);
        Notification.Builder nb = Build.VERSION.SDK_INT >= 26 ? new Notification.Builder(c, DailyPanchang.CHANNEL) : new Notification.Builder(c);
        nb.setSmallIcon(android.R.drawable.stat_sys_download_done)
                .setContentTitle("🔄 श्री रामजी एस्ट्रो")
                .setContentText(text)
                .setContentIntent(pi)
                .setAutoCancel(true);
        NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null) nm.notify(NOTE_ID, nb.build());
    }

    private static SharedPreferences prefs(Context c) {
        return c.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }
}
