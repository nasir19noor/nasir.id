package id.nasir.layarsehat

import android.app.AppOpsManager
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.os.Build
import android.os.Process
import android.telecom.TelecomManager
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale

/**
 * Membaca daftar aplikasi terpasang dan statistik pemakaian dari sistem.
 * Semua data bersifat metadata — tidak ada isi pesan atau berkas yang dibaca.
 */
object AppInspector {

    fun hasUsageAccess(context: Context): Boolean {
        val appOps = context.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
        val mode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            appOps.unsafeCheckOpNoThrow(
                AppOpsManager.OPSTR_GET_USAGE_STATS,
                Process.myUid(),
                context.packageName,
            )
        } else {
            @Suppress("DEPRECATION")
            appOps.checkOpNoThrow(
                AppOpsManager.OPSTR_GET_USAGE_STATS,
                Process.myUid(),
                context.packageName,
            )
        }
        return mode == AppOpsManager.MODE_ALLOWED
    }

    fun installedApps(context: Context): List<Map<String, Any?>> {
        val pm = context.packageManager
        val peluncur = pm.getInstalledApplications(PackageManager.GET_META_DATA)

        return peluncur.mapNotNull { info ->
            val paket = info.packageName
            // Lewati aplikasi ini sendiri agar tidak muncul di daftar orang tua.
            if (paket == context.packageName) return@mapNotNull null

            // Aplikasi bawaan pabrik dihitung sebagai sistem supaya mode ketat
            // hanya mengunci aplikasi yang benar-benar baru dipasang anak.
            val sistem = (info.flags and
                (ApplicationInfo.FLAG_SYSTEM or ApplicationInfo.FLAG_UPDATED_SYSTEM_APP)) != 0

            val versi = try {
                pm.getPackageInfo(paket, 0).versionName
            } catch (e: PackageManager.NameNotFoundException) {
                null
            }

            mapOf(
                "packageName" to paket,
                "appName" to pm.getApplicationLabel(info).toString(),
                "versionName" to versi,
                "isSystem" to sistem,
            )
        }
    }

    /** Total pemakaian per aplikasi per hari untuk [days] hari terakhir. */
    fun usageStats(context: Context, days: Int): List<Map<String, Any?>> {
        if (!hasUsageAccess(context)) return emptyList()

        val usm = context.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
        val pm = context.packageManager
        val formatTanggal = SimpleDateFormat("yyyy-MM-dd", Locale.US)
        val hasil = mutableListOf<Map<String, Any?>>()

        for (offset in 0 until days) {
            val awal = startOfDay(-offset)
            val akhir = minOf(awal + DAY_MILLIS, System.currentTimeMillis())
            if (akhir <= awal) continue

            val stats = usm.queryUsageStats(UsageStatsManager.INTERVAL_DAILY, awal, akhir)
            val perPaket = mutableMapOf<String, Long>()
            stats?.forEach { s ->
                if (s.totalTimeInForeground > 0 && s.packageName != context.packageName) {
                    perPaket[s.packageName] = (perPaket[s.packageName] ?: 0L) + s.totalTimeInForeground
                }
            }

            val tanggal = formatTanggal.format(awal)
            perPaket.forEach { (paket, milis) ->
                hasil.add(
                    mapOf(
                        "packageName" to paket,
                        "appName" to labelAplikasi(pm, paket),
                        "seconds" to (milis / 1000).toInt(),
                        "date" to tanggal,
                    )
                )
            }
        }
        return hasil
    }

    /**
     * Aplikasi yang tidak pernah dikunci oleh batas waktu atau jam tidur:
     * peluncur, telepon, antarmuka sistem, setelan, dan aplikasi ini sendiri.
     * Anak harus tetap bisa menelepon dan kembali ke beranda kapan pun.
     */
    fun essentialPackages(context: Context): Set<String> {
        val pm = context.packageManager
        val penting = mutableSetOf(context.packageName, "com.android.systemui")

        pm.resolveActivity(
            Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME),
            PackageManager.MATCH_DEFAULT_ONLY,
        )?.activityInfo?.packageName?.let { penting.add(it) }

        pm.resolveActivity(Intent(Intent.ACTION_DIAL), 0)
            ?.activityInfo?.packageName?.let { penting.add(it) }

        try {
            val telecom = context.getSystemService(Context.TELECOM_SERVICE) as? TelecomManager
            telecom?.defaultDialerPackage?.let { penting.add(it) }
        } catch (e: SecurityException) {
            // Sebagian ROM membatasi akses ini — cukup andalkan hasil resolveActivity.
        }

        pm.resolveActivity(Intent(android.provider.Settings.ACTION_SETTINGS), 0)
            ?.activityInfo?.packageName?.let { penting.add(it) }

        return penting
    }

    /**
     * Total detik pemakaian hari ini, di luar aplikasi penting seperti peluncur
     * dan telepon, agar batas harian menghitung waktu bermain yang sebenarnya.
     */
    fun totalSecondsToday(context: Context): Int {
        if (!hasUsageAccess(context)) return 0

        val usm = context.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
        val awal = startOfDay(0)
        val stats = usm.queryUsageStats(UsageStatsManager.INTERVAL_DAILY, awal, System.currentTimeMillis())
        val penting = essentialPackages(context)

        var total = 0L
        stats?.forEach { s ->
            if (s.packageName !in penting) total += s.totalTimeInForeground
        }
        return (total / 1000).toInt()
    }

    /** Paket aplikasi yang sedang tampil di layar, berdasarkan peristiwa terakhir. */
    fun foregroundPackage(context: Context): String? {
        if (!hasUsageAccess(context)) return null

        val usm = context.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
        val sekarang = System.currentTimeMillis()
        val peristiwa = usm.queryEvents(sekarang - 10_000, sekarang)

        var terakhir: String? = null
        val event = UsageEvents.Event()
        while (peristiwa.hasNextEvent()) {
            peristiwa.getNextEvent(event)
            if (event.eventType == UsageEvents.Event.MOVE_TO_FOREGROUND ||
                event.eventType == UsageEvents.Event.ACTIVITY_RESUMED
            ) {
                terakhir = event.packageName
            }
        }
        return terakhir
    }

    fun labelAplikasi(pm: PackageManager, paket: String): String = try {
        pm.getApplicationLabel(pm.getApplicationInfo(paket, 0)).toString()
    } catch (e: PackageManager.NameNotFoundException) {
        paket
    }

    private const val DAY_MILLIS = 24 * 60 * 60 * 1000L

    /** Milidetik pada tengah malam, [offsetHari] hari dari hari ini (0 = hari ini). */
    private fun startOfDay(offsetHari: Int): Long {
        val kalender = Calendar.getInstance().apply {
            add(Calendar.DAY_OF_YEAR, offsetHari)
            set(Calendar.HOUR_OF_DAY, 0)
            set(Calendar.MINUTE, 0)
            set(Calendar.SECOND, 0)
            set(Calendar.MILLISECOND, 0)
        }
        return kalender.timeInMillis
    }
}
