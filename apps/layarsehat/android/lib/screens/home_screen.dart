import 'dart:async';

import 'package:flutter/material.dart';
import 'package:package_info_plus/package_info_plus.dart';

import '../constants.dart';
import '../services/api_service.dart';
import '../services/native_bridge.dart';
import '../theme.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> with WidgetsBindingObserver {
  String? _namaAnak;
  Policy? _kebijakan;
  bool _menyinkron = false;
  String? _galat;
  DateTime? _sinkronTerakhir;

  bool _izinPemakaian = false;
  bool _izinOverlay = false;
  bool _izinNotifikasi = false;
  bool _abaikanBaterai = false;

  Timer? _timer;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _muatAwal();
    _timer = Timer.periodic(kSyncInterval, (_) => _sinkron(diam: true));
  }

  @override
  void dispose() {
    _timer?.cancel();
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) _periksaIzin();
  }

  Future<void> _muatAwal() async {
    _namaAnak = await ApiService.childName();
    await _periksaIzin();
    await _sinkron();
  }

  Future<void> _periksaIzin() async {
    final pemakaian = await NativeBridge.hasUsageAccess();
    final overlay = await NativeBridge.hasOverlayPermission();
    final notifikasi = await NativeBridge.hasNotificationPermission();
    final baterai = await NativeBridge.isIgnoringBatteryOptimizations();
    final berjalan = await NativeBridge.isMonitorRunning();

    if (!mounted) return;
    setState(() {
      _izinPemakaian = pemakaian;
      _izinOverlay = overlay;
      _izinNotifikasi = notifikasi;
      _abaikanBaterai = baterai;
    });

    // Layanan pemantau hanya berguna bila izin akses penggunaan sudah diberikan.
    if (pemakaian && !berjalan) {
      await NativeBridge.startMonitor();
    }
  }

  Future<void> _sinkron({bool diam = false}) async {
    if (_menyinkron) return;
    if (!diam) setState(() => _menyinkron = true);

    try {
      final paket = await PackageInfo.fromPlatform();
      final kebijakan = await ApiService.sync(appVersion: paket.version);
      if (!mounted) return;
      setState(() {
        _kebijakan = kebijakan;
        _sinkronTerakhir = DateTime.now();
        _galat = null;
        _menyinkron = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _galat = e.toString();
        _menyinkron = false;
      });
    }
  }

  bool get _semuaIzinSiap => _izinPemakaian && _izinOverlay;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('LayarSehat'),
        actions: [
          IconButton(
            onPressed: _menyinkron ? null : () => _sinkron(),
            tooltip: 'Perbarui sekarang',
            icon: _menyinkron
                ? const SizedBox(
                    height: 18,
                    width: 18,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.refresh),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          await _periksaIzin();
          await _sinkron();
        },
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            _kartuStatus(),
            const SizedBox(height: 12),
            if (!_semuaIzinSiap) ...[_kartuIzin(), const SizedBox(height: 12)],
            _kartuAturan(),
            const SizedBox(height: 12),
            if (_galat != null) ...[_kartuGalat(), const SizedBox(height: 12)],
            _kartuInfo(),
          ],
        ),
      ),
    );
  }

  Widget _kartuStatus() {
    final aktif = _semuaIzinSiap;
    return Kartu(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 12,
                height: 12,
                decoration: BoxDecoration(
                  color: aktif ? const Color(0xFF22A06B) : kKuning,
                  shape: BoxShape.circle,
                ),
              ),
              const SizedBox(width: 8),
              Text(
                aktif ? 'Perlindungan aktif' : 'Perlu penyiapan',
                style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            _namaAnak != null && _namaAnak!.isNotEmpty
                ? 'Perangkat ini terhubung dengan profil $_namaAnak.'
                : 'Perangkat ini sudah terhubung dengan dasbor orang tua.',
            style: const TextStyle(color: kTeksLembut, height: 1.5),
          ),
          if (_sinkronTerakhir != null) ...[
            const SizedBox(height: 6),
            Text(
              'Terakhir diperbarui pukul '
              '${_sinkronTerakhir!.hour.toString().padLeft(2, '0')}.'
              '${_sinkronTerakhir!.minute.toString().padLeft(2, '0')}',
              style: const TextStyle(color: kTeksLembut, fontSize: 12.5),
            ),
          ],
        ],
      ),
    );
  }

  Widget _kartuIzin() {
    return Kartu(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Izin yang dibutuhkan',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 4),
          const Text(
            'Tanpa izin ini, aturan dari orang tua tidak dapat dijalankan.',
            style: TextStyle(color: kTeksLembut, fontSize: 13.5, height: 1.5),
          ),
          const SizedBox(height: 14),
          _barisIzin(
            judul: 'Akses Penggunaan',
            keterangan: 'Membaca aplikasi apa yang sedang dibuka dan berapa lama',
            diberikan: _izinPemakaian,
            aksi: NativeBridge.openUsageAccessSettings,
          ),
          _barisIzin(
            judul: 'Tampil di atas aplikasi lain',
            keterangan: 'Menampilkan layar pengunci saat aplikasi terlarang dibuka',
            diberikan: _izinOverlay,
            aksi: NativeBridge.openOverlaySettings,
          ),
          _barisIzin(
            judul: 'Notifikasi',
            keterangan: 'Menampilkan status pemantauan secara terbuka',
            diberikan: _izinNotifikasi,
            aksi: () async {
              await NativeBridge.requestNotificationPermission();
              await _periksaIzin();
            },
          ),
          _barisIzin(
            judul: 'Bebas hemat baterai',
            keterangan: 'Agar pemantauan tidak dihentikan sistem',
            diberikan: _abaikanBaterai,
            aksi: NativeBridge.requestIgnoreBatteryOptimizations,
          ),
        ],
      ),
    );
  }

  Widget _barisIzin({
    required String judul,
    required String keterangan,
    required bool diberikan,
    required Future<void> Function() aksi,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(
            diberikan ? Icons.check_circle : Icons.radio_button_unchecked,
            color: diberikan ? const Color(0xFF22A06B) : kKuning,
            size: 20,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(judul, style: const TextStyle(fontWeight: FontWeight.w600)),
                Text(
                  keterangan,
                  style: const TextStyle(color: kTeksLembut, fontSize: 12.5, height: 1.4),
                ),
              ],
            ),
          ),
          if (!diberikan) TextButton(onPressed: aksi, child: const Text('Atur')),
        ],
      ),
    );
  }

  Widget _kartuAturan() {
    final k = _kebijakan;
    return Kartu(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Aturan dari orang tua',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 12),
          if (k == null)
            const Text('Memuat aturan…', style: TextStyle(color: kTeksLembut))
          else ...[
            _barisAturan(
              Icons.block,
              'Aplikasi diblokir',
              k.blockedPackages.isEmpty ? 'Tidak ada' : '${k.blockedPackages.length} aplikasi',
            ),
            _barisAturan(
              Icons.timer_outlined,
              'Batas harian',
              k.dailyLimitMinutes == null
                  ? 'Tanpa batas'
                  : '${k.dailyLimitMinutes} menit per hari',
            ),
            _barisAturan(
              Icons.bedtime_outlined,
              'Jam tidur',
              (k.bedtimeStart == null || k.bedtimeStart!.isEmpty)
                  ? 'Tidak diatur'
                  : '${k.bedtimeStart} – ${k.bedtimeEnd ?? ''}',
            ),
            _barisAturan(
              Icons.rule,
              'Aplikasi baru',
              k.defaultPolicy == 'block_new'
                  ? 'Dikunci sampai disetujui orang tua'
                  : 'Boleh dipakai',
            ),
          ],
        ],
      ),
    );
  }

  Widget _barisAturan(IconData ikon, String judul, String nilai) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        children: [
          Icon(ikon, size: 18, color: kTeksLembut),
          const SizedBox(width: 10),
          Expanded(child: Text(judul)),
          Text(nilai, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13.5)),
        ],
      ),
    );
  }

  Widget _kartuGalat() {
    return Kartu(
      padding: const EdgeInsets.all(16),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(Icons.wifi_off, color: kKuning, size: 20),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Gagal terhubung ke server',
                  style: TextStyle(fontWeight: FontWeight.w600),
                ),
                Text(
                  _galat!,
                  style: const TextStyle(color: kTeksLembut, fontSize: 12.5, height: 1.4),
                ),
                const Text(
                  'Aturan terakhir tetap berlaku sampai koneksi kembali.',
                  style: TextStyle(color: kTeksLembut, fontSize: 12.5, height: 1.4),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _kartuInfo() {
    return const Kartu(
      padding: EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Apa yang dipantau?',
            style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
          ),
          SizedBox(height: 8),
          Text(
            'LayarSehat hanya mengirim daftar aplikasi yang terpasang dan lama '
            'pemakaiannya ke akun orang tua. Isi pesan, foto, kata sandi, dan '
            'riwayat penjelajahan tidak pernah dibaca maupun dikirim.',
            style: TextStyle(color: kTeksLembut, height: 1.55, fontSize: 13.5),
          ),
        ],
      ),
    );
  }
}
