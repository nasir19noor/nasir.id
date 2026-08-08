package id.nasir.layarsehat

import android.content.Context
import java.util.Calendar

/**
 * Menyimpan kebijakan terakhir dari server agar tetap berlaku walaupun
 * aplikasi ditutup atau perangkat sedang luring.
 */
object PolicyStore {
    private const val PREFS = "layarsehat_policy"

    private const val KEY_BLOCKED = "blocked_packages"
    private const val KEY_LIMIT = "daily_limit_minutes"
    private const val KEY_BEDTIME_START = "bedtime_start"
    private const val KEY_BEDTIME_END = "bedtime_end"
    private const val KEY_BASE_URL = "base_url"
    private const val KEY_DEVICE_TOKEN = "device_token"

    private fun prefs(context: Context) =
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    fun savePolicy(
        context: Context,
        blocked: List<String>,
        dailyLimitMinutes: Int,
        bedtimeStart: String,
        bedtimeEnd: String,
    ) {
        prefs(context).edit()
            .putStringSet(KEY_BLOCKED, blocked.toSet())
            .putInt(KEY_LIMIT, dailyLimitMinutes)
            .putString(KEY_BEDTIME_START, bedtimeStart)
            .putString(KEY_BEDTIME_END, bedtimeEnd)
            .apply()
    }

    fun saveCredentials(context: Context, baseUrl: String, deviceToken: String) {
        prefs(context).edit()
            .putString(KEY_BASE_URL, baseUrl)
            .putString(KEY_DEVICE_TOKEN, deviceToken)
            .apply()
    }

    fun clearCredentials(context: Context) {
        prefs(context).edit()
            .remove(KEY_BASE_URL)
            .remove(KEY_DEVICE_TOKEN)
            .apply()
    }

    fun baseUrl(context: Context): String? = prefs(context).getString(KEY_BASE_URL, null)

    fun deviceToken(context: Context): String? = prefs(context).getString(KEY_DEVICE_TOKEN, null)

    fun blockedPackages(context: Context): Set<String> =
        prefs(context).getStringSet(KEY_BLOCKED, emptySet()) ?: emptySet()

    /** -1 berarti tanpa batas. */
    fun dailyLimitMinutes(context: Context): Int = prefs(context).getInt(KEY_LIMIT, -1)

    /** Apakah saat ini berada dalam rentang jam tidur yang ditetapkan orang tua. */
    fun isBedtimeNow(context: Context): Boolean {
        val mulai = prefs(context).getString(KEY_BEDTIME_START, "") ?: ""
        val selesai = prefs(context).getString(KEY_BEDTIME_END, "") ?: ""
        if (mulai.isBlank() || selesai.isBlank()) return false

        val menitMulai = parseMinutes(mulai) ?: return false
        val menitSelesai = parseMinutes(selesai) ?: return false

        val kalender = Calendar.getInstance()
        val sekarang = kalender.get(Calendar.HOUR_OF_DAY) * 60 + kalender.get(Calendar.MINUTE)

        return if (menitMulai <= menitSelesai) {
            sekarang in menitMulai until menitSelesai
        } else {
            // Melewati tengah malam, mis. 21:00–06:00
            sekarang >= menitMulai || sekarang < menitSelesai
        }
    }

    private fun parseMinutes(waktu: String): Int? {
        val bagian = waktu.split(":")
        if (bagian.size < 2) return null
        val jam = bagian[0].toIntOrNull() ?: return null
        val menit = bagian[1].toIntOrNull() ?: return null
        return jam * 60 + menit
    }
}
