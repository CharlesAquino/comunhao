package br.com.igreja.oracao;

import android.content.Context;
import android.content.SharedPreferences;
import android.content.pm.PackageInfo;
import android.os.Bundle;

import androidx.activity.OnBackPressedCallback;

import com.getcapacitor.BridgeActivity;

import br.com.igreja.oracao.updates.ApkUpdaterPlugin;

public class MainActivity extends BridgeActivity {
    private static final String RUNTIME_PREFS = "comunhao_runtime";
    private static final String CLEANED_VERSION_KEY = "cache_cleaned_version";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(ApkUpdaterPlugin.class);
        super.onCreate(savedInstanceState);
        configureSystemBackGesture();
        prepareUpdatedWebRuntime();
        exposeNativeBuildInfo();
    }

    private void configureSystemBackGesture() {
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                if (getBridge() == null || getBridge().getWebView() == null) return;
                getBridge().getWebView().evaluateJavascript(
                    "window.dispatchEvent(new CustomEvent('comunhao:native-back'))",
                    null
                );
            }
        });
    }

    private boolean packageWasUpdated() {
        try {
            PackageInfo info = getPackageManager().getPackageInfo(getPackageName(), 0);
            return info.lastUpdateTime > info.firstInstallTime + 1000L;
        } catch (Exception ignored) {
            return false;
        }
    }

    private void prepareUpdatedWebRuntime() {
        if (!packageWasUpdated() || getBridge() == null || getBridge().getWebView() == null) return;

        SharedPreferences preferences = getSharedPreferences(RUNTIME_PREFS, Context.MODE_PRIVATE);
        int cleanedVersion = preferences.getInt(CLEANED_VERSION_KEY, -1);
        if (cleanedVersion == BuildConfig.VERSION_CODE) return;

        preferences.edit().putInt(CLEANED_VERSION_KEY, BuildConfig.VERSION_CODE).apply();
        getBridge().getWebView().clearCache(true);

        String bootstrapUrl = "https://localhost/index.html?nativeBuild="
            + BuildConfig.VERSION_CODE
            + "&upgraded=1";

        getBridge().getWebView().post(() -> getBridge().getWebView().loadUrl(bootstrapUrl));
    }

    private void exposeNativeBuildInfo() {
        if (getBridge() == null || getBridge().getWebView() == null) return;
        boolean updated = packageWasUpdated();
        String versionName = BuildConfig.VERSION_NAME.replace("'", "\\'");
        String javascript = "window.__COMUNHAO_NATIVE_BUILD__={versionCode:"
            + BuildConfig.VERSION_CODE
            + ",versionName:'"
            + versionName
            + "',updated:"
            + updated
            + "};window.dispatchEvent(new Event('comunhao:native-ready'));";

        getBridge().getWebView().postDelayed(
            () -> getBridge().getWebView().evaluateJavascript(javascript, null),
            350L
        );
    }
}
