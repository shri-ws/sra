package in.shriramjiastro.patrika;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;
import android.webkit.MimeTypeMap;
import android.widget.Toast;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Saves files the page makes itself (blob:/data: links such as the kundali PDF).
 * A WebView cannot hand those to the browser, so the page streams the bytes here
 * in base64 chunks: they go to a cache file, then into Downloads (Android 10+)
 * and are opened in the phone's PDF viewer.
 */
final class FileSaver {

    private static final class Job {
        File file; String name; String mime; OutputStream out;
    }

    private static final Map<String, Job> JOBS = new HashMap<>();

    private FileSaver() {}

    /** JS run in the page for a blob:/data: download: reads it and streams it to the bridge. */
    static String pageScript(String url, String fallbackName) {
        String u = url.replace("\\", "\\\\").replace("'", "\\'");
        String f = fallbackName.replace("\\", "\\\\").replace("'", "\\'");
        return "(async function(u,f){try{var B=window.SRAAndroid;"
                + "var a=null;try{a=document.querySelector('a[href=\"'+u+'\"]');}catch(e){}"
                + "var n=(a&&a.getAttribute('download'))||f;"
                + "var r=await fetch(u);var b=await r.blob();"
                + "var buf=new Uint8Array(await b.arrayBuffer());"
                + "var t=B.fileBegin(n,b.type||'');if(!t)return;"
                + "var C=3*131072;for(var i=0;i<buf.length;i+=C){var p=buf.subarray(i,i+C),s='';"
                + "for(var j=0;j<p.length;j+=8192)s+=String.fromCharCode.apply(null,p.subarray(j,j+8192));"
                + "B.fileChunk(t,btoa(s));}"
                + "B.fileEnd(t);}catch(e){window.SRAAndroid&&window.SRAAndroid.fileFail(String(e));}})('"
                + u + "','" + f + "');";
    }

    static synchronized String begin(Activity a, String name, String mime) {
        try {
            if (mime == null || mime.isEmpty()) mime = guessMime(name);
            name = cleanName(name, mime);
            File dir = new File(a.getCacheDir(), "saved");
            if (!dir.exists()) dir.mkdirs();
            File[] old = dir.listFiles();
            if (old != null) for (File o : old) o.delete();
            Job j = new Job();
            j.file = new File(dir, name);
            j.name = name;
            j.mime = mime;
            j.out = new FileOutputStream(j.file);
            String token = UUID.randomUUID().toString();
            JOBS.put(token, j);
            return token;
        } catch (Exception e) {
            fail(a, String.valueOf(e));
            return "";
        }
    }

    static synchronized void chunk(Activity a, String token, String b64) {
        Job j = JOBS.get(token);
        if (j == null) return;
        try {
            j.out.write(Base64.decode(b64, Base64.DEFAULT));
        } catch (Exception e) {
            JOBS.remove(token);
            closeQuietly(j.out);
            fail(a, String.valueOf(e));
        }
    }

    static void end(final Activity a, String token) {
        final Job j;
        synchronized (FileSaver.class) { j = JOBS.remove(token); }
        if (j == null) return;
        closeQuietly(j.out);
        Uri open = null;
        boolean inDownloads = false;
        try {
            if (Build.VERSION.SDK_INT >= 29) {
                open = toDownloads(a, j);
                inDownloads = open != null;
            }
        } catch (Exception ignored) { /* fall back to the private copy */ }
        if (open == null) open = SavedFiles.uriFor(a, j.file);
        final Uri target = open;
        final String msg = inDownloads
                ? "PDF फ़ोन के Downloads में सेव हो गई: " + j.name
                : "PDF तैयार है: " + j.name;
        a.runOnUiThread(new Runnable() {
            @Override public void run() {
                Toast.makeText(a, msg, Toast.LENGTH_LONG).show();
                Intent v = new Intent(Intent.ACTION_VIEW);
                v.setDataAndType(target, j.mime);
                v.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
                try {
                    a.startActivity(Intent.createChooser(v, "PDF खोलें"));
                } catch (ActivityNotFoundException e) {
                    share(a, target, j.mime);
                }
            }
        });
    }

    static void fail(final Activity a, final String why) {
        a.runOnUiThread(new Runnable() {
            @Override public void run() {
                Toast.makeText(a, "फ़ाइल सेव नहीं हो सकी — दोबारा प्रयास करें।", Toast.LENGTH_LONG).show();
            }
        });
        android.util.Log.w("SRAFileSaver", "save failed: " + why);
    }

    private static void share(Activity a, Uri uri, String mime) {
        Intent s = new Intent(Intent.ACTION_SEND);
        s.setType(mime);
        s.putExtra(Intent.EXTRA_STREAM, uri);
        s.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        try { a.startActivity(Intent.createChooser(s, "PDF भेजें / सेव करें")); } catch (Exception ignored) {}
    }

    @android.annotation.TargetApi(29)
    private static Uri toDownloads(Activity a, Job j) throws Exception {
        ContentResolver cr = a.getContentResolver();
        ContentValues cv = new ContentValues();
        cv.put(MediaStore.MediaColumns.DISPLAY_NAME, j.name);
        cv.put(MediaStore.MediaColumns.MIME_TYPE, j.mime);
        cv.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS);
        cv.put(MediaStore.MediaColumns.IS_PENDING, 1);
        Uri uri = cr.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, cv);
        if (uri == null) return null;
        InputStream in = null; OutputStream out = null;
        try {
            in = new FileInputStream(j.file);
            out = cr.openOutputStream(uri);
            byte[] buf = new byte[65536];
            int n;
            while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
        } catch (Exception e) {
            closeQuietly(out); out = null;
            cr.delete(uri, null, null);
            throw e;
        } finally {
            closeQuietly(in);
            closeQuietly(out);
        }
        cv.clear();
        cv.put(MediaStore.MediaColumns.IS_PENDING, 0);
        cr.update(uri, cv, null, null);
        return uri;
    }

    private static String guessMime(String name) {
        String ext = MimeTypeMap.getFileExtensionFromUrl(name == null ? "" : name.replace(' ', '_'));
        String m = ext == null ? null : MimeTypeMap.getSingleton().getMimeTypeFromExtension(ext.toLowerCase());
        return m != null ? m : "application/octet-stream";
    }

    private static String cleanName(String name, String mime) {
        if (name == null) name = "";
        name = name.replaceAll("[\\\\/:*?\"<>|\\n\\r]", "_").trim();
        if (name.isEmpty()) name = "shriramji-astro";
        if (name.length() > 120) name = name.substring(0, 120);
        if (!name.contains(".")) {
            String ext = MimeTypeMap.getSingleton().getExtensionFromMimeType(mime);
            if (ext != null) name = name + "." + ext;
        }
        return name;
    }

    private static void closeQuietly(java.io.Closeable c) {
        if (c != null) try { c.close(); } catch (Exception ignored) {}
    }
}
