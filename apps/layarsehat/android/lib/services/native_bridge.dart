import 'package:flutter/services.dart';

/// Jembatan ke kode Kotlin: daftar aplikasi, statistik pemakaian,
/// izin sistem, dan layanan pemantau latar belakang.
class NativeBridge {
  static const MethodChannel _channel = MethodChannel('id.nasir.layarsehat/device');

  // ── Izin ──────────────────────────────────────────────────────
  static Future<bool> hasUsageAccess() async =>
      await _channel.invokeMethod<bool>('hasUsageAccess') ?? false;

  static Future<void> openUsageAccessSettings() =>
      _channel.invokeMethod('openUsageAccessSettings');

  static Future<bool> hasOverlayPermission() async =>
      await _channel.invokeMethod<bool>('hasOverlayPermission') ?? false;

  static Future<void> openOverlaySettings() =>
      _channel.invokeMethod('openOverlaySettings');

  static Future<bool> hasNotificationPermission() async =>
      await _channel.invokeMethod<bool>('hasNotificationPermission') ?? false;

  static Future<void> requestNotificationPermission() =>
      _channel.invokeMethod('requestNotificationPermission');

  static Future<bool> isIgnoringBatteryOptimizations() async =>
      await _channel.invokeMethod<bool>('isIgnoringBatteryOptimizations') ?? false;

  static Future<void> requestIgnoreBatteryOptimizations() =>
      _channel.invokeMethod('requestIgnoreBatteryOptimizations');

  // ── Data perangkat ────────────────────────────────────────────
  static Future<List<Map<String, dynamic>>> getInstalledApps() async {
    final hasil = await _channel.invokeListMethod<Map<dynamic, dynamic>>('getInstalledApps');
    return (hasil ?? []).map((e) => Map<String, dynamic>.from(e)).toList();
  }

  /// Statistik pemakaian [days] hari terakhir, satu entri per aplikasi per hari.
  static Future<List<Map<String, dynamic>>> getUsageStats({int days = 3}) async {
    final hasil = await _channel.invokeListMethod<Map<dynamic, dynamic>>(
      'getUsageStats',
      {'days': days},
    );
    return (hasil ?? []).map((e) => Map<String, dynamic>.from(e)).toList();
  }

  // ── Layanan pemantau ──────────────────────────────────────────
  static Future<void> startMonitor() => _channel.invokeMethod('startMonitor');

  static Future<void> stopMonitor() => _channel.invokeMethod('stopMonitor');

  static Future<bool> isMonitorRunning() async =>
      await _channel.invokeMethod<bool>('isMonitorRunning') ?? false;

  /// Menyimpan kebijakan terbaru agar layanan latar belakang bisa menegakkannya
  /// walaupun aplikasi ditutup.
  static Future<void> savePolicy({
    required List<String> blockedPackages,
    int? dailyLimitMinutes,
    String? bedtimeStart,
    String? bedtimeEnd,
  }) =>
      _channel.invokeMethod('savePolicy', {
        'blockedPackages': blockedPackages,
        'dailyLimitMinutes': dailyLimitMinutes ?? -1,
        'bedtimeStart': bedtimeStart ?? '',
        'bedtimeEnd': bedtimeEnd ?? '',
      });

  /// Menyimpan kredensial agar layanan bisa menyinkronkan sendiri.
  static Future<void> saveCredentials({
    required String baseUrl,
    required String deviceToken,
  }) =>
      _channel.invokeMethod('saveCredentials', {
        'baseUrl': baseUrl,
        'deviceToken': deviceToken,
      });

  static Future<void> clearCredentials() => _channel.invokeMethod('clearCredentials');
}
