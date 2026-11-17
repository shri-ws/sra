package in.shriramjiastro.patrika;

import android.app.Activity;
import android.app.NotificationManager;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.KeyEvent;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.GeolocationPermissions;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.ProgressBar;
import android.widget.Toast;

import java.util.UUID;

public class MainActivity extends Activity {

    private static final String START_URL = "https://shriramjiastro.in/patrika.html";
    static final String EXTRA_URL = "open_url";
    static final String EXTRA_CHECK_UPDATE = "check_update";
    private static final int REQ_NOTIFY = 77;
    private WebView webView;
    private volatile String currentHost = "shriramjiastro.in";
    private ProgressBar progressBar;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Modern Clean Fullscreen Header
        requestWindowFeature(Window.FEATURE_NO_TITLE);

        FrameLayout rootLayout = new FrameLayout(this);
        rootLayout.setLayoutParams(new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
        ));

        webView = new WebView(this);
        webView.setLayoutParams(new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
        ));
        rootLayout.addView(webView);

        progressBar = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        FrameLayout.LayoutParams pbParams = new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                8
        );
        progressBar.setLayoutParams(pbParams);
        progressBar.setMax(100);
        progressBar.setVisibility(View.GONE);
        rootLayout.addView(progressBar);

        setContentView(rootLayout);

        setupWebView();

        // a newer app version? (asks only when there is one)
        AppUpdate.check(this, true);

        String open = urlFrom(getIntent());
        if (open != null) {
            webView.loadUrl(open);
        } else if (savedInstanceState != null) {
            webView.restoreState(savedInstanceState);
        } else {
            webView.loadUrl(START_URL);
        }
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        String open = urlFrom(intent);
        if (open != null && webView != null) webView.loadUrl(open);
        if (intent.getBooleanExtra(EXTRA_CHECK_UPDATE, false)) AppUpdate.check(this, false);
    }

    @Override
    protected void onResume() {
        super.onResume();
        AppUpdate.resume(this);   // continue an update that waited for the install permission
    }

    /** Only our own pages may be opened from a notification. */
    private static String urlFrom(Intent intent) {
        if (intent == null) return null;
        String u = intent.getStringExtra(EXTRA_URL);
        return u != null && u.startsWith("https://shriramjiastro.in/") ? u : null;
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] results) {
        super.onRequestPermissionsResult(requestCode, permissions, results);
        if (requestCode != REQ_NOTIFY || webView == null) return;
        final String state = notifyState();
        webView.post(new Runnable() {
            @Override
            public void run() {
                webView.evaluateJavascript("window.SRAAndroidPermission && window.SRAAndroidPermission('" + state + "')", null);
            }
        });
    }

    private String notifyState() {
        if (Build.VERSION.SDK_INT >= 33
                && checkSelfPermission("android.permission.POST_NOTIFICATIONS") != PackageManager.PERMISSION_GRANTED) {
            return shouldShowRequestPermissionRationale("android.permission.POST_NOTIFICATIONS")
                    || !getSharedPreferences(DailyPanchang.PREFS + "_asked", MODE_PRIVATE).getBoolean("asked", false)
                    ? "default" : "denied";
        }
        if (Build.VERSION.SDK_INT >= 24) {
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null && !nm.areNotificationsEnabled()) return "denied";
        }
        return "granted";
    }

    /** window.SRAAndroid for panchang-subscribe.js: the app's own daily notification. */
    private class Bridge {
        private boolean ours() {
            String h = currentHost;
            return h != null && (h.equals("shriramjiastro.in") || h.endsWith(".shriramjiastro.in"));
        }

        @JavascriptInterface
        public int version() { return AppUpdate.myVersion(MainActivity.this); }

        /** The website's "check for app update" button. */
        @JavascriptInterface
        public void checkUpdate() {
            if (ours()) AppUpdate.check(MainActivity.this, false);
        }

        @JavascriptInterface
        public String deviceId() {
            if (!ours()) return "";
            SharedPreferences p = getSharedPreferences("device", MODE_PRIVATE);
            String id = p.getString("id", null);
            if (id == null) {
                id = UUID.randomUUID().toString();
                p.edit().putString("id", id).apply();
            }
            return id;
        }

        @JavascriptInterface
        public String notifyPermission() { return ours() ? notifyState() : "denied"; }

        @JavascriptInterface
        public void requestNotify() {
            if (!ours()) return;
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    if (Build.VERSION.SDK_INT >= 33) {
                        getSharedPreferences(DailyPanchang.PREFS + "_asked", MODE_PRIVATE).edit().putBoolean("asked", true).apply();
                        requestPermissions(new String[]{"android.permission.POST_NOTIFICATIONS"}, REQ_NOTIFY);
                    } else {
                        onRequestPermissionsResult(REQ_NOTIFY, new String[0], new int[0]);
                    }
                }
            });
        }

        @JavascriptInterface
        public void openNotifySettings() {
            if (!ours()) return;
            try {
                Intent i = new Intent("android.settings.APP_NOTIFICATION_SETTINGS");
                i.putExtra("android.provider.extra.APP_PACKAGE", getPackageName());
                i.putExtra("app_package", getPackageName());
                i.putExtra("app_uid", getApplicationInfo().uid);
                startActivity(i);
            } catch (Exception e) {
                startActivity(new Intent(android.provider.Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
                        Uri.parse("package:" + getPackageName())));
            }
        }

        @JavascriptInterface
        public boolean isDailyOn() { return ours() && DailyPanchang.isOn(MainActivity.this); }

        @JavascriptInterface
        public void enableDaily(String api, String id, String secret) {
            if (!ours() || api == null || !api.startsWith("https://")) return;
            DailyPanchang.enable(MainActivity.this, api, id, secret);
        }

        @JavascriptInterface
        public void disableDaily() {
            if (ours()) DailyPanchang.disable(MainActivity.this);
        }

        @JavascriptInterface
        public void testNow() {
            if (!ours()) return;
            Intent i = new Intent(MainActivity.this, DailyPanchang.class);
            i.setAction(DailyPanchang.ACTION_TEST);
            sendBroadcast(i);
        }
    }

    private void setupWebView() {
        WebSettings ws = webView.getSettings();
        ws.setJavaScriptEnabled(true);
        ws.setDomStorageEnabled(true);
        ws.setDatabaseEnabled(true);
        ws.setAllowFileAccess(true);
        ws.setCacheMode(WebSettings.LOAD_DEFAULT);
        ws.setSupportZoom(true);
        ws.setBuiltInZoomControls(true);
        ws.setDisplayZoomControls(false);
        ws.setUseWideViewPort(true);
        ws.setLoadWithOverviewMode(true);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            ws.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);
        }

        webView.addJavascriptInterface(new Bridge(), "SRAAndroid");

        // a WebView cannot download by itself (e.g. a newer APK): hand downloads to the browser
        webView.setDownloadListener(new android.webkit.DownloadListener() {
            @Override
            public void onDownloadStart(String url, String userAgent, String contentDisposition, String mimetype, long length) {
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)));
                } catch (Exception e) {
                    Toast.makeText(MainActivity.this, "डाउनलोड नहीं खुल सका।", Toast.LENGTH_SHORT).show();
                }
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onProgressChanged(WebView view, int newProgress) {
                if (newProgress < 100) {
                    progressBar.setVisibility(View.VISIBLE);
                    progressBar.setProgress(newProgress);
                } else {
                    progressBar.setVisibility(View.GONE);
                }
            }

            @Override
            public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback callback) {
                callback.invoke(origin, true, false);
            }
        });

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();
                return handleUrl(url);
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                return handleUrl(url);
            }

            private boolean handleUrl(String url) {
                if (url == null) return false;

                // Handle external protocols (WhatsApp, UPI, Phone, Mail)
                if (url.startsWith("upi:") || url.startsWith("whatsapp:") ||
                    url.startsWith("tel:") || url.startsWith("mailto:") ||
                    url.startsWith("intent:")) {
                    try {
                        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                        startActivity(intent);
                        return true;
                    } catch (Exception e) {
                        Toast.makeText(MainActivity.this, "ऐप उपलब्ध नहीं है।", Toast.LENGTH_SHORT).show();
                        return true;
                    }
                }

                // If loading internal domain or subpaths, keep inside WebView
                Uri uri = Uri.parse(url);
                String host = uri.getHost();
                if (host != null && (host.contains("shriramjiastro.in") || host.contains("github.io"))) {
                    return false;
                }

                // Open external links in device browser
                try {
                    Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                    startActivity(intent);
                    return true;
                } catch (Exception e) {
                    return false;
                }
            }

            @Override
            public void onPageStarted(WebView view, String url, Bitmap favicon) {
                super.onPageStarted(view, url, favicon);
                currentHost = url == null ? null : Uri.parse(url).getHost();
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                super.onReceivedError(view, request, error);
            }
        });
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_BACK && webView != null && webView.canGoBack()) {
            webView.goBack();
            return true;
        }
        return super.onKeyDown(keyCode, event);
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        if (webView != null) {
            webView.saveState(outState);
        }
    }
}
