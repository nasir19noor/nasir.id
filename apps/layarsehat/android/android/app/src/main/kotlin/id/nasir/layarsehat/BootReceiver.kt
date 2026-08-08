package id.nasir.layarsehat

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/** Menyalakan kembali layanan pemantau setelah perangkat dinyalakan ulang. */
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val aksi = intent.action
        if (aksi != Intent.ACTION_BOOT_COMPLETED && aksi != Intent.ACTION_MY_PACKAGE_REPLACED) return

        // Hanya berjalan bila perangkat sudah dipasangkan dan izin sudah diberikan.
        if (PolicyStore.deviceToken(context) == null) return
        if (!AppInspector.hasUsageAccess(context)) return

        MonitorService.start(context)
    }
}
