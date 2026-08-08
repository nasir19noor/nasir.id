import 'package:flutter/material.dart';

import 'services/api_service.dart';
import 'screens/home_screen.dart';
import 'screens/pairing_screen.dart';
import 'theme.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const LayarSehatApp());
}

class LayarSehatApp extends StatelessWidget {
  const LayarSehatApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'LayarSehat',
      debugShowCheckedModeBanner: false,
      theme: buildTheme(),
      home: const _Gerbang(),
    );
  }
}

/// Menentukan layar awal: pemasangan kode bila perangkat belum terhubung.
class _Gerbang extends StatelessWidget {
  const _Gerbang();

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<bool>(
      future: ApiService.isPaired(),
      builder: (context, snapshot) {
        if (!snapshot.hasData) {
          return const Scaffold(
            body: Center(child: CircularProgressIndicator()),
          );
        }
        return snapshot.data! ? const HomeScreen() : const PairingScreen();
      },
    );
  }
}
