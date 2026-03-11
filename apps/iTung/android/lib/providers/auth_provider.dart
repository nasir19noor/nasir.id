import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../constants.dart';
import '../models/user.dart';
import '../services/api_service.dart';

class AuthProvider extends ChangeNotifier {
  final ApiService _api;

  User? _user;
  String? _token;
  bool _loading = false;
  String? _error;

  AuthProvider(this._api);

  User? get user => _user;
  String? get token => _token;
  bool get loading => _loading;
  String? get error => _error;
  bool get isAuthenticated => _token != null && _user != null;

  Future<void> init() async {
    final prefs = await SharedPreferences.getInstance();
    _token = prefs.getString(kTokenKey);
    final userJson = prefs.getString(kUserKey);
    if (_token != null && userJson != null) {
      try {
        _user = User.fromJson(jsonDecode(userJson) as Map<String, dynamic>);
        _api.setToken(_token);
        _user = await _api.getMe();
        await _saveUser(_user!);
      } catch (_) {
        await logout();
      }
    }
    notifyListeners();
  }

  Future<bool> login(String username, String password) async {
    _loading = true;
    _error = null;
    notifyListeners();
    try {
      final data = await _api.login(username, password);
      _token = data['access_token'] as String;
      _user = User.fromJson(data['user'] as Map<String, dynamic>);
      _api.setToken(_token);
      await _persist();
      return true;
    } on ApiException catch (e) {
      _error = e.message;
      return false;
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  /// Returns 'logged_in', 'needs_registration', or throws on error.
  Future<String> loginWithGoogle(String idToken) async {
    _loading = true;
    _error = null;
    notifyListeners();
    try {
      final data = await _api.googleLogin(idToken: idToken);
      if (data['needs_username'] == true) {
        return 'needs_registration';
      }
      _token = data['access_token'] as String;
      _user = User.fromJson(data['user'] as Map<String, dynamic>);
      _api.setToken(_token);
      await _persist();
      return 'logged_in';
    } on ApiException catch (e) {
      _error = e.message;
      return 'error';
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  Future<bool> completeGoogleRegister({
    required String idToken,
    required String username,
    required String fullName,
    required String birthDate,
    required String phoneNumber,
    required String otpCode,
  }) async {
    _loading = true;
    _error = null;
    notifyListeners();
    try {
      final data = await _api.googleLogin(
        idToken: idToken,
        username: username,
        fullName: fullName,
        birthDate: birthDate,
        phoneNumber: phoneNumber,
        otpCode: otpCode,
      );
      _token = data['access_token'] as String;
      _user = User.fromJson(data['user'] as Map<String, dynamic>);
      _api.setToken(_token);
      await _persist();
      return true;
    } on ApiException catch (e) {
      _error = e.message;
      return false;
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  Future<bool> register({
    required String username,
    required String email,
    required String password,
    String? fullName,
    String? birthDate,
  }) async {
    _loading = true;
    _error = null;
    notifyListeners();
    try {
      await _api.register(
        username: username,
        email: email,
        password: password,
        fullName: fullName,
        birthDate: birthDate,
      );
      return await login(username, password);
    } on ApiException catch (e) {
      _error = e.message;
      return false;
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  Future<void> logout() async {
    _token = null;
    _user = null;
    _api.setToken(null);
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(kTokenKey);
    await prefs.remove(kUserKey);
    notifyListeners();
  }

  Future<bool> updateProfile({String? fullName, String? email, String? birthDate}) async {
    _loading = true;
    _error = null;
    notifyListeners();
    try {
      _user = await _api.updateMe(
        fullName: fullName,
        email: email,
        birthDate: birthDate,
      );
      await _saveUser(_user!);
      return true;
    } on ApiException catch (e) {
      _error = e.message;
      return false;
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }

  Future<void> _persist() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(kTokenKey, _token!);
    await _saveUser(_user!);
  }

  Future<void> _saveUser(User u) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(kUserKey, jsonEncode({
      'id': u.id,
      'username': u.username,
      'email': u.email,
      'full_name': u.fullName,
      'phone_number': u.phoneNumber,
      'is_active': u.isActive,
      'is_admin': u.isAdmin,
      'ai_access': u.aiAccess,
      'birth_date': u.birthDate,
      'avatar_url': u.avatarUrl,
      'cartoon_url': u.cartoonUrl,
    }));
  }
}
