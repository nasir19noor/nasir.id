import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

import '../constants.dart';
import 'native_bridge.dart';

class ApiException implements Exception {
  final String message;
  ApiException(this.message);
  @override
  String toString() => message;
}

class Policy {
  final String defaultPolicy;
  final List<String> blockedPackages;
  final int? dailyLimitMinutes;
  final String? bedtimeStart;
  final String? bedtimeEnd;

  Policy({
    required this.defaultPolicy,
    required this.blockedPackages,
    this.dailyLimitMinutes,
    this.bedtimeStart,
    this.bedtimeEnd,
  });

  factory Policy.fromJson(Map<String, dynamic> json) => Policy(
        defaultPolicy: json['default_policy'] as String? ?? 'allow',
        blockedPackages: List<String>.from(json['blocked_packages'] ?? const []),
        dailyLimitMinutes: json['daily_limit_minutes'] as int?,
        bedtimeStart: json['bedtime_start'] as String?,
        bedtimeEnd: json['bedtime_end'] as String?,
      );
}

class ApiService {
  static Future<String?> deviceToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(kDeviceTokenKey);
  }

  static Future<bool> isPaired() async => (await deviceToken()) != null;

  static Map<String, String> _headers([String? token]) => {
        'Content-Type': 'application/json',
        if (token != null) 'X-Device-Token': token,
      };

  static dynamic _decode(http.Response res) {
    final body = res.body.isEmpty ? null : jsonDecode(res.body);
    if (res.statusCode >= 400) {
      final detail = body is Map ? body['detail'] : null;
      throw ApiException(detail is String ? detail : 'Gagal menghubungi server');
    }
    return body;
  }

  /// Menghubungkan perangkat ini dengan profil anak menggunakan kode 6 digit.
  static Future<void> pair({
    required String code,
    required String deviceName,
    String? brand,
    String? model,
    String? androidVersion,
    String? appVersion,
  }) async {
    final res = await http
        .post(
          Uri.parse('$kBaseUrl/agent/pair'),
          headers: _headers(),
          body: jsonEncode({
            'code': code,
            'device_name': deviceName,
            'brand': brand,
            'model': model,
            'android_version': androidVersion,
            'app_version': appVersion,
          }),
        )
        .timeout(const Duration(seconds: 20));

    final data = _decode(res) as Map<String, dynamic>;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(kDeviceTokenKey, data['device_token'] as String);
    await prefs.setString(kChildNameKey, data['child_name'] as String? ?? '');
    await prefs.setInt(kDeviceIdKey, data['device_id'] as int);

    await NativeBridge.saveCredentials(
      baseUrl: kBaseUrl,
      deviceToken: data['device_token'] as String,
    );
  }

  /// Mengirim daftar aplikasi + pemakaian, lalu menerima kebijakan terbaru.
  static Future<Policy> sync({String? appVersion}) async {
    final token = await deviceToken();
    if (token == null) throw ApiException('Perangkat belum terhubung');

    final apps = await NativeBridge.getInstalledApps();
    final usage = await NativeBridge.getUsageStats(days: 3);

    final res = await http
        .post(
          Uri.parse('$kBaseUrl/agent/sync'),
          headers: _headers(token),
          body: jsonEncode({
            'app_version': appVersion,
            'installed_apps': apps
                .map((a) => {
                      'package_name': a['packageName'],
                      'app_name': a['appName'],
                      'version_name': a['versionName'],
                      'is_system': a['isSystem'] ?? false,
                    })
                .toList(),
            'usage': usage
                .map((u) => {
                      'package_name': u['packageName'],
                      'app_name': u['appName'],
                      'seconds': u['seconds'] ?? 0,
                      'usage_date': u['date'],
                    })
                .toList(),
          }),
        )
        .timeout(const Duration(seconds: 30));

    final data = _decode(res) as Map<String, dynamic>;
    final policy = Policy.fromJson(Map<String, dynamic>.from(data['policy']));
    await _applyPolicy(policy);
    return policy;
  }

  static Future<Policy> fetchPolicy() async {
    final token = await deviceToken();
    if (token == null) throw ApiException('Perangkat belum terhubung');

    final res = await http
        .get(Uri.parse('$kBaseUrl/agent/policy'), headers: _headers(token))
        .timeout(const Duration(seconds: 20));

    final policy = Policy.fromJson(Map<String, dynamic>.from(_decode(res)));
    await _applyPolicy(policy);
    return policy;
  }

  static Future<void> _applyPolicy(Policy policy) => NativeBridge.savePolicy(
        blockedPackages: policy.blockedPackages,
        dailyLimitMinutes: policy.dailyLimitMinutes,
        bedtimeStart: policy.bedtimeStart,
        bedtimeEnd: policy.bedtimeEnd,
      );

  static Future<String?> childName() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(kChildNameKey);
  }
}
