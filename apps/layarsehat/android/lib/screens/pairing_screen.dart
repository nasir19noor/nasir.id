import 'package:device_info_plus/device_info_plus.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:package_info_plus/package_info_plus.dart';

import '../services/api_service.dart';
import '../theme.dart';
import 'home_screen.dart';

class PairingScreen extends StatefulWidget {
  const PairingScreen({super.key});

  @override
  State<PairingScreen> createState() => _PairingScreenState();
}

class _PairingScreenState extends State<PairingScreen> {
  final _kode = TextEditingController();
  bool _memproses = false;
  String? _galat;

  @override
  void dispose() {
    _kode.dispose();
    super.dispose();
  }

  Future<void> _hubungkan() async {
    final kode = _kode.text.trim();
    if (kode.length != 6) {
      setState(() => _galat = 'Kode harus terdiri dari 6 angka');
      return;
    }

    setState(() {
      _memproses = true;
      _galat = null;
    });

    try {
      final info = await DeviceInfoPlugin().androidInfo;
      final paket = await PackageInfo.fromPlatform();

      await ApiService.pair(
        code: kode,
        deviceName: '${info.brand} ${info.model}'.trim(),
        brand: info.brand,
        model: info.model,
        androidVersion: info.version.release,
        appVersion: paket.version,
      );

      if (!mounted) return;
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (_) => const HomeScreen()),
      );
    } catch (e) {
      setState(() {
        _galat = e.toString();
        _memproses = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SizedBox(height: 32),
              const Text('📱', style: TextStyle(fontSize: 52), textAlign: TextAlign.center),
              const SizedBox(height: 12),
              const Text(
                'LayarSehat',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 26, fontWeight: FontWeight.w800, color: kTeks),
              ),
              const SizedBox(height: 8),
              const Text(
                'Masukkan kode pemasangan 6 digit dari dasbor orang tua untuk menghubungkan HP ini.',
                textAlign: TextAlign.center,
                style: TextStyle(color: kTeksLembut, height: 1.5),
              ),
              const SizedBox(height: 32),
              TextField(
                controller: _kode,
                keyboardType: TextInputType.number,
                textAlign: TextAlign.center,
                maxLength: 6,
                enabled: !_memproses,
                inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                style: const TextStyle(
                  fontSize: 30,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 12,
                ),
                decoration: const InputDecoration(
                  hintText: '000000',
                  counterText: '',
                  contentPadding: EdgeInsets.symmetric(vertical: 18),
                ),
              ),
              if (_galat != null) ...[
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFDECEA),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(_galat!, style: const TextStyle(color: kMerah)),
                ),
              ],
              const SizedBox(height: 20),
              ElevatedButton(
                onPressed: _memproses ? null : _hubungkan,
                child: _memproses
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                      )
                    : const Text('Hubungkan Perangkat'),
              ),
              const SizedBox(height: 28),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: kHijauMuda,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Cara mendapatkan kode',
                      style: TextStyle(fontWeight: FontWeight.w700, color: kHijauTua),
                    ),
                    SizedBox(height: 6),
                    Text(
                      '1. Orang tua membuka layarsehat.nasir.id\n'
                      '2. Pilih profil anak, klik "Kode Pemasangan"\n'
                      '3. Masukkan kode tersebut di sini sebelum 15 menit',
                      style: TextStyle(color: kHijauTua, height: 1.6),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
