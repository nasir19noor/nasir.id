import 'dart:convert';
import 'package:http/http.dart' as http;
import '../constants.dart';
import '../models/user.dart';
import '../models/quiz.dart';

class ApiException implements Exception {
  final String message;
  final int? statusCode;
  ApiException(this.message, {this.statusCode});

  @override
  String toString() => message;
}

class ApiService {
  final String baseUrl;
  String? _token;

  ApiService({this.baseUrl = kBaseUrl});

  void setToken(String? token) => _token = token;

  Map<String, String> get _headers => {
        'Content-Type': 'application/json',
        if (_token != null) 'Authorization': 'Bearer $_token',
      };

  Future<dynamic> _get(String path) async {
    final res = await http.get(Uri.parse('$baseUrl$path'), headers: _headers);
    return _handle(res);
  }

  Future<dynamic> _post(String path, Map<String, dynamic> body) async {
    final res = await http.post(
      Uri.parse('$baseUrl$path'),
      headers: _headers,
      body: jsonEncode(body),
    );
    return _handle(res);
  }

  Future<dynamic> _put(String path, Map<String, dynamic> body) async {
    final res = await http.put(
      Uri.parse('$baseUrl$path'),
      headers: _headers,
      body: jsonEncode(body),
    );
    return _handle(res);
  }

  dynamic _handle(http.Response res) {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      if (res.body.isEmpty) return null;
      return jsonDecode(utf8.decode(res.bodyBytes));
    }
    String message = 'Terjadi kesalahan';
    try {
      final body = jsonDecode(res.body);
      message = body['detail'] ?? body['message'] ?? message;
    } catch (_) {}
    throw ApiException(message, statusCode: res.statusCode);
  }

  // ── Auth ──────────────────────────────────────────────────────────

  Future<Map<String, dynamic>> login(String username, String password) async {
    // Backend uses OAuth2PasswordRequestForm — requires form-urlencoded, not JSON
    final res = await http.post(
      Uri.parse('$baseUrl/api/users/login'),
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        if (_token != null) 'Authorization': 'Bearer $_token',
      },
      body: {'username': username, 'password': password},
    );
    return _handle(res) as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> register({
    required String username,
    required String email,
    required String password,
    String? fullName,
    String? birthDate,
  }) async {
    final data = await _post('/api/users/register', {
      'username': username,
      'email': email,
      'password': password,
      if (fullName != null) 'full_name': fullName,
      if (birthDate != null) 'birth_date': birthDate,
    });
    return data as Map<String, dynamic>;
  }

  Future<User> getMe() async {
    final data = await _get('/api/users/me');
    return User.fromJson(data as Map<String, dynamic>);
  }

  Future<Map<String, dynamic>> googleLogin({
    required String idToken,
    String? username,
    String? fullName,
    String? birthDate,
    String? phoneNumber,
    String? otpCode,
  }) async {
    final data = await _post('/api/users/google-login', {
      'id_token': idToken,
      if (username != null) 'username': username,
      if (fullName != null) 'full_name': fullName,
      if (birthDate != null) 'birth_date': birthDate,
      if (phoneNumber != null) 'phone_number': phoneNumber,
      if (otpCode != null) 'otp_code': otpCode,
    });
    return data as Map<String, dynamic>;
  }

  Future<void> sendOtp(String phone) async {
    await _post('/api/users/send-otp', {'phone': phone});
  }

  Future<User> updateMe({String? fullName, String? email, String? birthDate}) async {
    final body = <String, dynamic>{};
    if (fullName != null) body['full_name'] = fullName;
    if (email != null) body['email'] = email;
    if (birthDate != null) body['birth_date'] = birthDate;
    final data = await _put('/api/users/me', body);
    return User.fromJson(data as Map<String, dynamic>);
  }

  // ── Quiz ──────────────────────────────────────────────────────────

  Future<Map<String, dynamic>> getTopics() async {
    final data = await _get('/api/quiz/topics');
    return data as Map<String, dynamic>;
  }

  Future<QuizSession> createSession({
    required String topic,
    required int totalQuestions,
    required bool useAi,
    bool includeImages = false,
    String difficultyLevel = 'adaptif',
  }) async {
    final data = await _post('/api/quiz/sessions', {
      'topic': topic,
      'total_questions': totalQuestions,
      'use_ai': useAi,
      'include_images': includeImages,
      'difficulty_level': difficultyLevel,
      'client': 'android',
    });
    return QuizSession.fromJson(data as Map<String, dynamic>);
  }

  Future<AnswerResult> submitAnswer({
    required int questionId,
    required int sessionId,
    required String userAnswer,
    int? timeSeconds,
  }) async {
    final data = await _post('/api/quiz/submit-answer', {
      'question_id': questionId,
      'session_id': sessionId,
      'user_answer': userAnswer,
      if (timeSeconds != null) 'time_seconds': timeSeconds,
    });
    return AnswerResult.fromJson(data as Map<String, dynamic>);
  }

  Future<UserStats> getUserStats() async {
    final data = await _get('/api/quiz/stats');
    return UserStats.fromJson(data as Map<String, dynamic>);
  }
}
