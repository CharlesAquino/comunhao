package br.com.igreja.oracao.updates;

import android.content.Intent;
import android.content.pm.PackageInfo;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import androidx.core.content.FileProvider;
import androidx.core.content.pm.PackageInfoCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.security.MessageDigest;

@CapacitorPlugin(name = "ApkUpdater")
public class ApkUpdaterPlugin extends Plugin {
    @PluginMethod
    public void getInstalledVersion(PluginCall call) {
        try {
            PackageInfo packageInfo;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                packageInfo = getContext().getPackageManager().getPackageInfo(
                    getContext().getPackageName(),
                    android.content.pm.PackageManager.PackageInfoFlags.of(0)
                );
            } else {
                packageInfo = getContext().getPackageManager().getPackageInfo(getContext().getPackageName(), 0);
            }

            JSObject result = new JSObject();
            result.put("packageName", getContext().getPackageName());
            result.put("versionName", packageInfo.versionName);
            result.put("versionCode", PackageInfoCompat.getLongVersionCode(packageInfo));
            call.resolve(result);
        } catch (Exception exception) {
            call.reject("Não foi possível ler a versão instalada.", exception);
        }
    }

    @PluginMethod
    public void canInstallPackages(PluginCall call) {
        JSObject result = new JSObject();
        result.put("granted", getContext().getPackageManager().canRequestPackageInstalls());
        call.resolve(result);
    }

    @PluginMethod
    public void openInstallSettings(PluginCall call) {
        try {
            Intent intent = new Intent(
                Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                Uri.parse("package:" + getContext().getPackageName())
            );
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            call.resolve();
        } catch (Exception exception) {
            call.reject("Não foi possível abrir as configurações de instalação.", exception);
        }
    }

    @PluginMethod
    public void downloadApk(PluginCall call) {
        String url = call.getString("url");
        String fileName = call.getString("fileName", "comunhao-update.apk");
        String expectedSha256 = call.getString("sha256");

        if (url == null || url.trim().isEmpty()) {
            call.reject("A URL do APK é obrigatória.");
            return;
        }

        bridge.execute(() -> {
            File updatesDir = new File(getContext().getExternalFilesDir(null), "updates");
            if (!updatesDir.exists() && !updatesDir.mkdirs()) {
                call.reject("Não foi possível preparar a pasta de atualizações.");
                return;
            }

            File destination = new File(updatesDir, fileName);
            HttpURLConnection connection = null;

            try {
                URL downloadUrl = new URL(url);
                connection = (HttpURLConnection) downloadUrl.openConnection();
                connection.setConnectTimeout(15000);
                connection.setReadTimeout(30000);
                connection.setUseCaches(false);
                connection.connect();

                int statusCode = connection.getResponseCode();
                if (statusCode < 200 || statusCode >= 300) {
                    call.reject("Falha ao baixar o APK. HTTP " + statusCode);
                    return;
                }

                long totalBytes = connection.getContentLengthLong();
                MessageDigest digest = MessageDigest.getInstance("SHA-256");

                try (InputStream inputStream = connection.getInputStream();
                     FileOutputStream outputStream = new FileOutputStream(destination, false)) {
                    byte[] buffer = new byte[8192];
                    long receivedBytes = 0;
                    int readBytes;

                    while ((readBytes = inputStream.read(buffer)) != -1) {
                        outputStream.write(buffer, 0, readBytes);
                        digest.update(buffer, 0, readBytes);
                        receivedBytes += readBytes;

                        JSObject progress = new JSObject();
                        progress.put("receivedBytes", receivedBytes);
                        progress.put("totalBytes", totalBytes);
                        if (totalBytes > 0) {
                            progress.put("percent", (receivedBytes * 100) / totalBytes);
                        }
                        notifyListeners("downloadProgress", progress);
                    }

                    outputStream.flush();
                }

                String computedSha256 = toHex(digest.digest());
                if (expectedSha256 != null && !expectedSha256.trim().isEmpty()
                    && !computedSha256.equalsIgnoreCase(expectedSha256.trim())) {
                    destination.delete();
                    call.reject("O arquivo baixado falhou na verificação de integridade.");
                    return;
                }

                JSObject result = new JSObject();
                result.put("filePath", destination.getAbsolutePath());
                result.put("sha256", computedSha256);
                result.put("size", destination.length());
                call.resolve(result);
            } catch (Exception exception) {
                if (destination.exists()) {
                    destination.delete();
                }
                call.reject("Não foi possível baixar o APK.", exception);
            } finally {
                if (connection != null) {
                    connection.disconnect();
                }
            }
        });
    }

    @PluginMethod
    public void installApk(PluginCall call) {
        String filePath = call.getString("filePath");
        if (filePath == null || filePath.trim().isEmpty()) {
            call.reject("O caminho do arquivo é obrigatório.");
            return;
        }

        try {
            File apkFile = new File(filePath);
            if (!apkFile.exists()) {
                call.reject("O APK informado não foi encontrado.");
                return;
            }

            Uri apkUri = FileProvider.getUriForFile(
                getContext(),
                getContext().getPackageName() + ".fileprovider",
                apkFile
            );

            Intent installIntent = new Intent(Intent.ACTION_VIEW);
            installIntent.setDataAndType(apkUri, "application/vnd.android.package-archive");
            installIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            installIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            getContext().startActivity(installIntent);
            call.resolve();
        } catch (Exception exception) {
            call.reject("Não foi possível abrir o instalador do Android.", exception);
        }
    }

    private String toHex(byte[] bytes) {
        StringBuilder builder = new StringBuilder();
        for (byte currentByte : bytes) {
            builder.append(String.format("%02x", currentByte));
        }
        return builder.toString();
    }
}
