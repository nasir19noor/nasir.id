package id.nasir.layarsehat

import android.app.Activity
import android.content.Intent
import android.graphics.Color
import android.os.Bundle
import android.view.Gravity
import android.view.ViewGroup
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView

/**
 * Layar penuh yang muncul ketika anak membuka aplikasi yang tidak diizinkan.
 * Nadanya sengaja ramah, bukan menghukum.
 */
class BlockActivity : Activity() {

    companion object {
        const val EXTRA_APP_NAME = "app_name"
        const val EXTRA_REASON = "reason"

        const val REASON_BLOCKED = "blocked"
        const val REASON_BEDTIME = "bedtime"
        const val REASON_LIMIT = "limit"
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val namaAplikasi = intent.getStringExtra(EXTRA_APP_NAME) ?: "Aplikasi ini"
        val alasan = intent.getStringExtra(EXTRA_REASON) ?: REASON_BLOCKED

        val (emoji, judul, penjelasan) = when (alasan) {
            REASON_BEDTIME -> Triple(
                "🌙",
                "Waktunya istirahat",
                "$namaAplikasi tidak bisa dibuka sekarang karena sudah masuk jam tidur yang " +
                    "disepakati bersama orang tua. Sampai jumpa besok!",
            )
            REASON_LIMIT -> Triple(
                "⏰",
                "Waktu layar hari ini sudah habis",
                "Batas pemakaian harian sudah tercapai. $namaAplikasi bisa dibuka lagi besok, " +
                    "atau bicarakan dengan orang tua bila memang perlu.",
            )
            else -> Triple(
                "🔒",
                "Aplikasi ini sedang dikunci",
                "$namaAplikasi belum diizinkan oleh orang tua. Kalau kamu merasa aplikasi ini " +
                    "perlu untuk sekolah atau hal penting lain, mintalah persetujuan mereka.",
            )
        }

        setContentView(bangunTampilan(emoji, judul, penjelasan))
    }

    private fun bangunTampilan(emoji: String, judul: String, penjelasan: String): LinearLayout {
        val padding = (24 * resources.displayMetrics.density).toInt()

        return LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setBackgroundColor(Color.parseColor("#0F5F4C"))
            setPadding(padding, padding, padding, padding)
            layoutParams = ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT,
            )

            addView(TextView(context).apply {
                text = emoji
                textSize = 56f
                gravity = Gravity.CENTER
            })

            addView(TextView(context).apply {
                text = judul
                textSize = 24f
                setTextColor(Color.WHITE)
                gravity = Gravity.CENTER
                setPadding(0, padding / 2, 0, padding / 3)
            })

            addView(TextView(context).apply {
                text = penjelasan
                textSize = 15f
                setTextColor(Color.parseColor("#CFE8E0"))
                gravity = Gravity.CENTER
                setLineSpacing(0f, 1.35f)
            })

            val tombol = Button(context).apply {
                text = "Kembali ke Beranda"
                setOnClickListener { pulangKeBeranda() }
            }
            addView(
                tombol,
                LinearLayout.LayoutParams(
                    ViewGroup.LayoutParams.WRAP_CONTENT,
                    ViewGroup.LayoutParams.WRAP_CONTENT,
                ).apply { topMargin = padding },
            )
        }
    }

    private fun pulangKeBeranda() {
        startActivity(Intent(Intent.ACTION_MAIN).apply {
            addCategory(Intent.CATEGORY_HOME)
            flags = Intent.FLAG_ACTIVITY_NEW_TASK
        })
        finish()
    }

    /** Tombol kembali mengarahkan ke beranda, bukan kembali ke aplikasi terkunci. */
    @Suppress("DEPRECATION", "OVERRIDE_DEPRECATION")
    override fun onBackPressed() {
        pulangKeBeranda()
    }
}
