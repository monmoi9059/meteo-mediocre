package ca.portquebec.stromuald.terminal;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.view.Display;
import android.view.Surface;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.CookieManager;
import android.webkit.GeolocationPermissions;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import androidx.webkit.WebViewAssetLoader;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

public class MainActivity extends Activity implements SensorEventListener {

    private static final String APP_ENTRY_URL = "https://appassets.androidplatform.net/assets/index.html";
    private static final String PORTQC_LIVE_URL = "https://www.portquebec.ca/operations-maritimes/mouvements-des-navires/rapport-des-navires-presents";

    private WebView webView;
    private SensorManager sensorManager;
    private volatile boolean gyroRequested = false;
    private volatile boolean compassMode = false;
    private volatile boolean sensorRegistered = false;
    private float lastValidAzDeg = 135.0f;
    private long lastEmitNanos = 0L;

    private final float[] rotMatrix = new float[9];
    private final float[] remappedMatrix = new float[9];
    private final float[] accelReading = new float[3];
    private final float[] magReading = new float[3];
    private boolean hasAccel = false;
    private boolean hasMag = false;

    @SuppressLint({"SetJavaScriptEnabled", "AddJavascriptInterface"})
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        Window window = getWindow();
        if (window != null) {
            window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
            window.setStatusBarColor(Color.parseColor("#040B16"));
            window.setNavigationBarColor(Color.parseColor("#040B16"));
        }

        sensorManager = (SensorManager) getSystemService(Context.SENSOR_SERVICE);

        webView = new WebView(this);
        webView.setBackgroundColor(Color.parseColor("#040B16"));
        webView.setLayerType(View.LAYER_TYPE_HARDWARE, null);
        webView.setVerticalScrollBarEnabled(true);
        webView.setHorizontalScrollBarEnabled(false);
        webView.setOverScrollMode(View.OVER_SCROLL_IF_CONTENT_SCROLLS);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setSupportZoom(false);
        settings.setGeolocationEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);
        settings.setTextZoom(100);

        CookieManager cookieManager = CookieManager.getInstance();
        if (cookieManager != null) {
            cookieManager.setAcceptCookie(true);
            cookieManager.setAcceptThirdPartyCookies(webView, true);
        }

        final WebViewAssetLoader assetLoader = new WebViewAssetLoader.Builder()
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();

        webView.addJavascriptInterface(new AndroidGyroBridge(), "AndroidGyroBridge");

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback callback) {
                callback.invoke(origin, true, false);
            }
        });

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if (uri != null && "appassets.androidplatform.net".equalsIgnoreCase(uri.getHost())) {
                    String path = uri.getPath();
                    if ("/api/portqc-live".equals(path)) {
                        return proxyPortQuebecLive();
                    }
                    return assetLoader.shouldInterceptRequest(uri);
                }
                return super.shouldInterceptRequest(view, request);
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if (uri == null) return false;
                String host = uri.getHost();
                if ("appassets.androidplatform.net".equalsIgnoreCase(host)) {
                    return false;
                }
                if (request.isForMainFrame()) {
                    try {
                        Intent browserIntent = new Intent(Intent.ACTION_VIEW, uri);
                        startActivity(browserIntent);
                    } catch (Exception ignored) {
                    }
                    return true;
                }
                return false;
            }
        });

        setContentView(webView);
        webView.loadUrl(APP_ENTRY_URL);
    }

    /**
     * Relais HTTPS natif sans restriction CORS vers le rapport officiel du Port de Québec
     * pour les Sections 86 & 87 (en complément du relais GitHub temps réel).
     */
    private WebResourceResponse proxyPortQuebecLive() {
        Map<String, String> headers = new HashMap<>();
        headers.put("Access-Control-Allow-Origin", "*");
        headers.put("Cache-Control", "no-store");
        HttpURLConnection conn = null;
        try {
            URL url = new URL(PORTQC_LIVE_URL);
            conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("GET");
            conn.setConnectTimeout(6500);
            conn.setReadTimeout(6500);
            conn.setRequestProperty("User-Agent", "Mozilla/5.0 (Linux; Android 14) StRomualdTerminal/3.0");
            conn.setRequestProperty("Accept", "text/html,application/xhtml+xml");
            int status = conn.getResponseCode();
            if (status >= 200 && status < 300) {
                InputStream in = conn.getInputStream();
                ByteArrayOutputStream bos = new ByteArrayOutputStream();
                byte[] buf = new byte[8192];
                int n;
                while ((n = in.read(buf)) != -1) {
                    bos.write(buf, 0, n);
                }
                in.close();
                return new WebResourceResponse(
                        "text/html",
                        "UTF-8",
                        200,
                        "OK",
                        headers,
                        new ByteArrayInputStream(bos.toByteArray())
                );
            }
        } catch (Exception ignored) {
        } finally {
            if (conn != null) {
                conn.disconnect();
            }
        }
        return new WebResourceResponse(
                "text/plain",
                "UTF-8",
                502,
                "Bad Gateway",
                headers,
                new ByteArrayInputStream("Unavailable".getBytes(StandardCharsets.UTF_8))
        );
    }

    private synchronized void registerActiveSensors() {
        unregisterActiveSensors();
        if (sensorManager == null || !gyroRequested) return;

        Sensor primary = null;
        if (compassMode) {
            primary = sensorManager.getDefaultSensor(Sensor.TYPE_ROTATION_VECTOR);
            if (primary == null) {
                primary = sensorManager.getDefaultSensor(Sensor.TYPE_GEOMAGNETIC_ROTATION_VECTOR);
            }
        } else {
            primary = sensorManager.getDefaultSensor(Sensor.TYPE_GAME_ROTATION_VECTOR);
            if (primary == null) {
                primary = sensorManager.getDefaultSensor(Sensor.TYPE_ROTATION_VECTOR);
            }
        }

        if (primary != null) {
            sensorRegistered = sensorManager.registerListener(this, primary, SensorManager.SENSOR_DELAY_GAME);
            return;
        }

        // Repli universel Accéléromètre + Magnétomètre pour appareils d'entrée de gamme sans gyroscope dédié
        Sensor accel = sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER);
        Sensor mag = sensorManager.getDefaultSensor(Sensor.TYPE_MAGNETIC_FIELD);
        if (accel != null && mag != null) {
            boolean okA = sensorManager.registerListener(this, accel, SensorManager.SENSOR_DELAY_GAME);
            boolean okM = sensorManager.registerListener(this, mag, SensorManager.SENSOR_DELAY_GAME);
            sensorRegistered = okA && okM;
        }
    }

    private synchronized void unregisterActiveSensors() {
        if (sensorManager != null && sensorRegistered) {
            sensorManager.unregisterListener(this);
        }
        sensorRegistered = false;
        hasAccel = false;
        hasMag = false;
    }

    @Override
    public void onSensorChanged(SensorEvent event) {
        if (!gyroRequested || event == null) return;

        long now = event.timestamp > 0 ? event.timestamp : System.nanoTime();
        // Cadencer vers ~60Hz (14ms min) pour fluidité maximale sans saturer le pont JS
        if (now - lastEmitNanos < 14_000_000L) return;

        boolean gotMatrix = false;
        int type = event.sensor.getType();

        if (type == Sensor.TYPE_GAME_ROTATION_VECTOR
                || type == Sensor.TYPE_ROTATION_VECTOR
                || type == Sensor.TYPE_GEOMAGNETIC_ROTATION_VECTOR) {
            SensorManager.getRotationMatrixFromVector(rotMatrix, event.values);
            gotMatrix = true;
        } else if (type == Sensor.TYPE_ACCELEROMETER) {
            System.arraycopy(event.values, 0, accelReading, 0, Math.min(3, event.values.length));
            hasAccel = true;
            if (hasMag) {
                gotMatrix = SensorManager.getRotationMatrix(rotMatrix, null, accelReading, magReading);
            }
        } else if (type == Sensor.TYPE_MAGNETIC_FIELD) {
            System.arraycopy(event.values, 0, magReading, 0, Math.min(3, event.values.length));
            hasMag = true;
            if (hasAccel) {
                gotMatrix = SensorManager.getRotationMatrix(rotMatrix, null, accelReading, magReading);
            }
        }

        if (!gotMatrix) return;
        lastEmitNanos = now;

        int screenRot = getCurrentDisplayRotation();
        int axisX = SensorManager.AXIS_X;
        int axisY = SensorManager.AXIS_Y;
        if (screenRot == Surface.ROTATION_90) {
            axisX = SensorManager.AXIS_Y;
            axisY = SensorManager.AXIS_MINUS_X;
        } else if (screenRot == Surface.ROTATION_180) {
            axisX = SensorManager.AXIS_MINUS_X;
            axisY = SensorManager.AXIS_MINUS_Y;
        } else if (screenRot == Surface.ROTATION_270) {
            axisX = SensorManager.AXIS_MINUS_Y;
            axisY = SensorManager.AXIS_X;
        }
        SensorManager.remapCoordinateSystem(rotMatrix, axisX, axisY, remappedMatrix);

        // Rayon optique arrière de l'appareil photo (-Z écran) projeté dans le repère ENU (Est, Nord, Haut)
        // Zéro angle d'Euler intermédiaire = zéro blocage de cardan (gimbal lock) à 90° !
        float east = -remappedMatrix[2];
        float north = -remappedMatrix[5];
        float up = Math.max(-1.0f, Math.min(1.0f, -remappedMatrix[8]));

        float horizNorm = (float) Math.hypot(east, north);
        float azDeg = (horizNorm > 1e-3f)
                ? (float) (((Math.toDegrees(Math.atan2(east, north)) % 360.0) + 360.0) % 360.0)
                : lastValidAzDeg;
        lastValidAzDeg = azDeg;

        float altDeg = (float) Math.toDegrees(Math.asin(up));
        float rollDeg = (float) Math.toDegrees(Math.atan2(remappedMatrix[6], remappedMatrix[7]));
        final boolean isAbs = compassMode && (type != Sensor.TYPE_GAME_ROTATION_VECTOR);

        final String jsCall = String.format(
                Locale.US,
                "window.__onAndroidNativeGyro&&window.__onAndroidNativeGyro(%.2f,%.2f,%.2f,%s);",
                azDeg,
                altDeg,
                rollDeg,
                isAbs ? "true" : "false"
        );

        runOnUiThread(() -> {
            if (webView != null && gyroRequested) {
                webView.evaluateJavascript(jsCall, null);
            }
        });
    }

    @Override
    public void onAccuracyChanged(Sensor sensor, int accuracy) {
    }

    @SuppressWarnings("deprecation")
    private int getCurrentDisplayRotation() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                Display d = getDisplay();
                if (d != null) return d.getRotation();
            }
            WindowManager wm = (WindowManager) getSystemService(Context.WINDOW_SERVICE);
            if (wm != null && wm.getDefaultDisplay() != null) {
                return wm.getDefaultDisplay().getRotation();
            }
        } catch (Exception ignored) {
        }
        return Surface.ROTATION_0;
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (webView != null) {
            webView.onResume();
        }
        if (gyroRequested) {
            registerActiveSensors();
        }
    }

    @Override
    protected void onPause() {
        unregisterActiveSensors();
        if (webView != null) {
            webView.onPause();
        }
        super.onPause();
    }

    @Override
    protected void onDestroy() {
        unregisterActiveSensors();
        if (webView != null) {
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }

    @Override
    @SuppressWarnings("deprecation")
    public void onBackPressed() {
        if (webView != null) {
            webView.evaluateJavascript(
                    "(window.__handleAndroidBack ? window.__handleAndroidBack() : false)",
                    result -> {
                        if ("true".equals(result)) {
                            return;
                        }
                        if (webView != null && webView.canGoBack()) {
                            webView.goBack();
                        } else {
                            super.onBackPressed();
                        }
                    }
            );
            return;
        }
        super.onBackPressed();
    }

    public class AndroidGyroBridge {
        @JavascriptInterface
        public void startGyro(final String mode) {
            compassMode = "compass".equalsIgnoreCase(mode);
            gyroRequested = true;
            runOnUiThread(MainActivity.this::registerActiveSensors);
        }

        @JavascriptInterface
        public void stopGyro() {
            gyroRequested = false;
            runOnUiThread(MainActivity.this::unregisterActiveSensors);
        }

        @JavascriptInterface
        public void vibrate(final int durationMs) {
            try {
                int ms = Math.max(5, Math.min(120, durationMs));
                Vibrator vib = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
                if (vib != null && vib.hasVibrator()) {
                    vib.vibrate(VibrationEffect.createOneShot(ms, VibrationEffect.DEFAULT_AMPLITUDE));
                }
            } catch (Exception ignored) {
            }
        }

        @JavascriptInterface
        public boolean copyText(final String text) {
            try {
                ClipboardManager cb = (ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);
                if (cb != null) {
                    cb.setPrimaryClip(ClipData.newPlainText("Terminal St-Romuald", text));
                    return true;
                }
            } catch (Exception ignored) {
            }
            return false;
        }
    }
}
