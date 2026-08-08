package id.nasir.layarsehat

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.util.Log
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import kotlin.concurrent.thread

/**
 * Layanan latar depan yang mengawasi aplikasi mana yang sedang dibuka dan
 * menampilkan layar pengunci bila melanggar aturan orang tua.
 *
 * Notifikasi sengaja dibuat terlihat: LayarSehat tidak menyembunyikan diri.
 */
class MonitorService : Service() {

    companion object {
        const val CHANNEL_ID = "layarsehat_monitor"
        const val NOTIFICATION_ID = 4501
        private const val TAG = "LayarSehatMonitor"
        private const val CEK_INTERVAL_MS = 2_000L
        private const val SEGARKAN_KEBIJAKAN_MS = 15 * 60 * 1000L

        @Volatile
        var isRunning = false
            private set

        fun start(context: Context) {
            context.startForegroundService(Intent(context, MonitorService::class.java))
        }

        fun stop(context: Context) {
            context.stopService(Intent(context, MonitorService::class.java))
        }
    }

    private val handler = Handler(Looper.getMainLooper())
    private var kebijakanTerakhirDisegarkan = 0L
    private var paketDikunciTerakhir: String? = null
    private var aplikasiPentingTersimpan: Set<String>? = null

    private val tugasPemantau = object : Runnable {
        override fun run() {
            try {
                periksa()
            } catch (e: Exception) {
                Log.e(TAG, "Gagal memeriksa aplikasi aktif", e)
            }
            handler.postDelayed(this, CEK_INTERVAL_MS)
        }
    }

    override fun onCreate() {
        super.onCreate()
        buatSaluranNotifikasi()
        // Tipe "specialUse" baru tersedia sejak Android 14.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            startForeground(
                NOTIFICATION_ID,
                buatNotifikasi(),
                ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE,
            )
        } else {
            startForeground(NOTIFICATION_ID, buatNotifikasi())
        }
        isRunning = true
        handler.post(tugasPemantau)
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int = START_STICKY

    override fun onDestroy() {
        isRunning = false
        handler.removeCallbacks(tugasPemantau)
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    // ── Inti pemantauan ───────────────────────────────────────────
    private fun periksa() {
        segarkanKebijakanBilaPerlu()

        val paket = AppInspector.foregroundPackage(this) ?: return

        // Aplikasi ini sendiri (termasuk layar pengunci) tidak pernah dikunci.
        // Penanda direset agar layar pengunci muncul lagi bila anak kembali
        // membuka aplikasi yang sama.
        if (paket == packageName) {
            paketDikunciTerakhir = null
            return
        }

        val alasan = alasanPemblokiran(paket) ?: run {
            paketDikunciTerakhir = null
            return
        }

        // Hindari membuka layar pengunci berulang kali untuk paket yang sama.
        if (paketDikunciTerakhir == paket) return
        paketDikunciTerakhir = paket

        val intent = Intent(this, BlockActivity::class.java).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK)
            putExtra(BlockActivity.EXTRA_APP_NAME, AppInspector.labelAplikasi(packageManager, paket))
            putExtra(BlockActivity.EXTRA_REASON, alasan)
        }
        startActivity(intent)
    }

    /** Mengembalikan alasan pemblokiran, atau null bila aplikasi boleh dipakai. */
    private fun alasanPemblokiran(paket: String): String? {
        // Peluncur, telepon, setelan, dan antarmuka sistem tidak pernah dikunci —
        // anak harus selalu bisa kembali ke beranda dan menelepon saat darurat,
        // apa pun aturannya.
        if (paket in aplikasiPenting()) return null

        if (PolicyStore.blockedPackages(this).contains(paket)) {
            return BlockActivity.REASON_BLOCKED
        }

        if (PolicyStore.isBedtimeNow(this)) {
            return BlockActivity.REASON_BEDTIME
        }
        val batasMenit = PolicyStore.dailyLimitMinutes(this)
        if (batasMenit > 0 && AppInspector.totalSecondsToday(this) >= batasMenit * 60) {
            return BlockActivity.REASON_LIMIT
        }
        return null
    }

    /** Daftar aplikasi penting jarang berubah, jadi cukup dihitung sekali. */
    private fun aplikasiPenting(): Set<String> {
        return aplikasiPentingTersimpan ?: AppInspector.essentialPackages(this).also {
            aplikasiPentingTersimpan = it
        }
    }

    // ── Sinkronisasi kebijakan ────────────────────────────────────
    private fun segarkanKebijakanBilaPerlu() {
        val sekarang = System.currentTimeMillis()
        if (sekarang - kebijakanTerakhirDisegarkan < SEGARKAN_KEBIJAKAN_MS) return
        kebijakanTerakhirDisegarkan = sekarang

        val baseUrl = PolicyStore.baseUrl(this) ?: return
        val token = PolicyStore.deviceToken(this) ?: return

        thread(name = "layarsehat-policy") {
            try {
                val koneksi = (URL("$baseUrl/agent/policy").openConnection() as HttpURLConnection).apply {
                    requestMethod = "GET"
                    setRequestProperty("X-Device-Token", token)
                    connectTimeout = 15_000
                    readTimeout = 15_000
                }
                if (koneksi.responseCode == 200) {
                    val json = JSONObject(koneksi.inputStream.bufferedReader().use { it.readText() })
                    val daftar = json.optJSONArray("blocked_packages")
                    val diblokir = buildList {
                        for (i in 0 until (daftar?.length() ?: 0)) add(daftar!!.getString(i))
                    }
                    PolicyStore.savePolicy(
                        this,
                        diblokir,
                        if (json.isNull("daily_limit_minutes")) -1 else json.getInt("daily_limit_minutes"),
                        if (json.isNull("bedtime_start")) "" else json.optString("bedtime_start"),
                        if (json.isNull("bedtime_end")) "" else json.optString("bedtime_end"),
                    )
                }
                koneksi.disconnect()
            } catch (e: Exception) {
                Log.w(TAG, "Gagal menyegarkan kebijakan: ${e.message}")
            }
        }
    }

    // ── Notifikasi ────────────────────────────────────────────────
    private fun buatSaluranNotifikasi() {
        val saluran = NotificationChannel(
            CHANNEL_ID,
            "Status LayarSehat",
            NotificationManager.IMPORTANCE_LOW,
        ).apply {
            description = "Menandakan bahwa pemantauan sedang berjalan"
            setShowBadge(false)
        }
        (getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager)
            .createNotificationChannel(saluran)
    }

    private fun buatNotifikasi(): Notification {
        val buka = PendingIntent.getActivity(
            this,
            0,
            Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_IMMUTABLE,
        )

        return Notification.Builder(this, CHANNEL_ID)
            .setContentTitle("LayarSehat aktif")
            .setContentText("Aturan dari orang tua sedang berjalan")
            .setSmallIcon(android.R.drawable.ic_lock_idle_lock)
            .setContentIntent(buka)
            .setOngoing(true)
            .build()
    }
}
