import 'package:flutter/foundation.dart';
import '../models/quiz.dart';
import '../services/api_service.dart';

enum QuizState { idle, creating, active, submitting, finished, error }

class QuizProvider extends ChangeNotifier {
  final ApiService _api;

  QuizState _state = QuizState.idle;
  QuizSession? _session;
  Question? _currentQuestion;
  AnswerResult? _lastResult;
  String? _error;
  int _questionCount = 0;
  final List<bool> _answers = [];
  final Stopwatch _stopwatch = Stopwatch();

  QuizProvider(this._api);

  QuizState get state => _state;
  QuizSession? get session => _session;
  Question? get currentQuestion => _currentQuestion;
  AnswerResult? get lastResult => _lastResult;
  String? get error => _error;
  int get questionCount => _questionCount;
  List<bool> get answers => List.unmodifiable(_answers);
  int get correctCount => _answers.where((a) => a).length;
  bool get isLoading => _state == QuizState.creating || _state == QuizState.submitting;

  Future<bool> startQuiz({
    required String topic,
    required int totalQuestions,
    required bool useAi,
    bool includeImages = false,
    String difficultyLevel = 'adaptif',
  }) async {
    _state = QuizState.creating;
    _error = null;
    _answers.clear();
    _questionCount = 0;
    _lastResult = null;
    notifyListeners();
    try {
      _session = await _api.createSession(
        topic: topic,
        totalQuestions: totalQuestions,
        useAi: useAi,
        includeImages: includeImages,
        difficultyLevel: difficultyLevel,
      );
      _currentQuestion = _session!.firstQuestion;
      _questionCount = 1;
      _state = QuizState.active;
      _stopwatch
        ..reset()
        ..start();
      notifyListeners();
      return true;
    } on ApiException catch (e) {
      _error = e.message;
      _state = QuizState.error;
      notifyListeners();
      return false;
    }
  }

  Future<void> submitAnswer(String answer) async {
    if (_currentQuestion == null || _session == null) return;
    _stopwatch.stop();
    final elapsed = _stopwatch.elapsed.inSeconds;
    _state = QuizState.submitting;
    notifyListeners();
    try {
      _lastResult = await _api.submitAnswer(
        questionId: _currentQuestion!.id,
        sessionId: _session!.sessionId,
        userAnswer: answer,
        timeSeconds: elapsed,
      );
      _answers.add(_lastResult!.isCorrect);
      if (_lastResult!.nextQuestion != null) {
        _currentQuestion = _lastResult!.nextQuestion;
        _questionCount++;
        _state = QuizState.active;
        _stopwatch
          ..reset()
          ..start();
      } else {
        _state = QuizState.finished;
      }
      notifyListeners();
    } on ApiException catch (e) {
      _error = e.message;
      _state = QuizState.error;
      notifyListeners();
    }
  }

  void reset() {
    _state = QuizState.idle;
    _session = null;
    _currentQuestion = null;
    _lastResult = null;
    _error = null;
    _questionCount = 0;
    _answers.clear();
    _stopwatch.reset();
    notifyListeners();
  }
}
