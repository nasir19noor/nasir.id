package id.nasir.layarsehat

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

class MainActivity : FlutterActivity() {

    companion object {
        private const val CHANNEL = "id.nasir.layarsehat/device"
        private const val REQ_NOTIFICATION = 8801
    }

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)

        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, CHANNEL)
            .setMethodCallHandler { call, result ->
                when (call.method) {
                    // ── Izin ──
                    "hasUsageAccess" -> result.success(AppInspector.hasUsageAccess(this))
                    "openUsageAccessSettings" -> {
                        startActivity(Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS))
                        result.success(null)
                    }
                    "hasOverlayPermission" -> result.success(Settings.canDrawOverlays(this))
                    "openOverlaySettings" -> {
                        startActivity(
                            Intent(
                                Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                                Uri.parse("package:$packageName"),
                            )
                        )
                        result.success(null)
                    }
                    "hasNotificationPermission" -> result.success(hasNotificationPermission())
                    "requestNotificationPermission" -> {
                        requestNotificationPermission()
                        result.success(null)
                    }
                    "isIgnoringBatteryOptimizations" -> result.success(isIgnoringBatteryOptimizations())
                    "requestIgnoreBatteryOptimizations" -> {
                        requestIgnoreBatteryOptimizations()
                        result.success(null)
                    }

                    // ── Data perangkat ──
                    "getInstalledApps" -> result.success(AppInspector.installedApps(this))
                    "getUsageStats" -> {
                        val hari = call.argument<Int>("days") ?: 3
                        result.success(AppInspector.usageStats(this, hari))
                    }

                    // ── Layanan pemantau ──
                    "startMonitor" -> {
                        MonitorService.start(this)
                        result.success(null)
                    }
                    "stopMonitor" -> {
                        MonitorService.stop(this)
                        result.success(null)
                    }
                    "isMonitorRunning" -> result.success(MonitorService.isRunning)

                    // ── Penyimpanan kebijakan & kredensial ──
                    "savePolicy" -> {
                        PolicyStore.savePolicy(
                            this,
                            call.argument<List<String>>("blockedPackages") ?: emptyList(),
                            call.argument<Int>("dailyLimitMinutes") ?: -1,
                            call.argument<String>("bedtimeStart") ?: "",
                            call.argument<String>("bedtimeEnd") ?: "",
                        )
                        result.success(null)
                    }
                    "saveCredentials" -> {
                        PolicyStore.saveCredentials(
                            this,
                            call.argument<String>("baseUrl") ?: "",
                            call.argument<String>("deviceToken") ?: "",
                        )
                        result.success(null)
                    }
                    "clearCredentials" -> {
                        PolicyStore.clearCredentials(this)
                        MonitorService.stop(this)
                        result.success(null)
                    }

                    else -> result.notImplemented()
                }
            }
    }

    private fun hasNotificationPermission(): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return true
        return checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) ==
            PackageManager.PERMISSION_GRANTED
    }

    private fun requestNotificationPermission() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return
        requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), REQ_NOTIFICATION)
    }

    private fun isIgnoringBatteryOptimizations(): Boolean {
        val pm = getSystemService(Context.POWER_SERVICE) as PowerManager
        return pm.isIgnoringBatteryOptimizations(packageName)
    }

    @SuppressLint("BatteryLife")
    private fun requestIgnoreBatteryOptimizations() {
        if (isIgnoringBatteryOptimizations()) return
        startActivity(
            Intent(
                Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS,
                Uri.parse("package:$packageName"),
            )
        )
    }
}
