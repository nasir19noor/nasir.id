import 'dart:async';
import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../providers/quiz_provider.dart';
import '../theme.dart';
import '../constants.dart';

class QuizScreen extends StatefulWidget {
  const QuizScreen({super.key});

  @override
  State<QuizScreen> createState() => _QuizScreenState();
}

class _QuizScreenState extends State<QuizScreen>
    with SingleTickerProviderStateMixin {
  String? _selectedAnswer;
  bool _answered = false;
  int _timerSeconds = 0;
  Timer? _timer;
  late AnimationController _resultAnim;
  late Animation<double> _resultScale;

  @override
  void initState() {
    super.initState();
    _resultAnim = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 400),
    );
    _resultScale = CurvedAnimation(parent: _resultAnim, curve: Curves.elasticOut);
    _startTimer();
  }

  void _startTimer() {
    _timer?.cancel();
    _timerSeconds = 0;
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted) setState(() => _timerSeconds++);
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    _resultAnim.dispose();
    super.dispose();
  }

  Future<void> _selectAnswer(String answer) async {
    if (_answered) return;
    _timer?.cancel();
    setState(() {
      _selectedAnswer = answer;
      _answered = true;
    });
    _resultAnim.forward(from: 0);

    final quiz = context.read<QuizProvider>();
    final router = GoRouter.of(context);
    await quiz.submitAnswer(answer);

    if (quiz.state == QuizState.finished && mounted) {
      await Future.delayed(const Duration(milliseconds: 800));
      if (mounted) router.pushReplacement('/result');
    }
  }

  void _nextQuestion() {
    final quiz = context.read<QuizProvider>();
    if (quiz.state == QuizState.active) {
      setState(() {
        _selectedAnswer = null;
        _answered = false;
      });
      _resultAnim.reset();
      _startTimer();
    }
  }

  Color _choiceColor(String choice, String? correctAnswer) {
    if (!_answered) return Colors.white;
    final isSelected = choice.startsWith(_selectedAnswer?.substring(0, 1) ?? '');
    final isCorrect = correctAnswer != null && choice.startsWith(correctAnswer);
    if (isCorrect) return AppTheme.success.withValues(alpha: 0.15);
    if (isSelected && !isCorrect) return AppTheme.error.withValues(alpha: 0.12);
    return Colors.white;
  }

  Color _choiceBorderColor(String choice, String? correctAnswer) {
    if (!_answered) return const Color(0xFFDDD8FF);
    final isSelected = choice.startsWith(_selectedAnswer?.substring(0, 1) ?? '');
    final isCorrect = correctAnswer != null && choice.startsWith(correctAnswer);
    if (isCorrect) return AppTheme.success;
    if (isSelected && !isCorrect) return AppTheme.error;
    return const Color(0xFFDDD8FF);
  }

  @override
  Widget build(BuildContext context) {
    final quiz = context.watch<QuizProvider>();
    final session = quiz.session;
    final question = quiz.currentQuestion;
    final result = quiz.lastResult;

    if (session == null || question == null) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    final total = session.totalQuestions;
    final current = quiz.questionCount;
    final progress = current / total;

    return Scaffold(
      appBar: AppBar(
        title: Text('${session.topic[0].toUpperCase()}${session.topic.substring(1)}'),
        leading: IconButton(
          icon: const Icon(Icons.close),
          onPressed: () => _showQuitDialog(context),
        ),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 16),
            child: Center(
              child: Text(
                '$current / $total',
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                ),
              ),
            ),
          ),
        ],
      ),
      body: Column(
        children: [
          // Progress bar
          LinearProgressIndicator(
            value: progress,
            backgroundColor: AppTheme.primary.withValues(alpha: 0.2),
            valueColor: const AlwaysStoppedAnimation<Color>(Colors.white),
            minHeight: 6,
          ),
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Timer & difficulty
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 12, vertical: 6),
                        decoration: BoxDecoration(
                          color: _timerSeconds > 30
                              ? AppTheme.warning.withValues(alpha: 0.15)
                              : AppTheme.primary.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(
                              Icons.timer_outlined,
                              size: 16,
                              color: _timerSeconds > 30
                                  ? AppTheme.warning
                                  : AppTheme.primary,
                            ),
                            const SizedBox(width: 4),
                            Text(
                              '${_timerSeconds}s',
                              style: TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.bold,
                                color: _timerSeconds > 30
                                    ? AppTheme.warning
                                    : AppTheme.primary,
                              ),
                            ),
                          ],
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 12, vertical: 6),
                        decoration: BoxDecoration(
                          color: AppTheme.secondary.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(
                          '${kDifficultyEmoji[question.difficulty] ?? ''} ${kDifficultyLabels[question.difficulty] ?? question.difficulty}',
                          style: const TextStyle(
                            fontSize: 13,
                            color: AppTheme.secondary,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),

                  // Question card
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(20),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Soal ${question.number}',
                            style: const TextStyle(
                              fontSize: 12,
                              color: AppTheme.textSecondary,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            question.question,
                            style: const TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.w600,
                              color: AppTheme.textPrimary,
                              height: 1.5,
                            ),
                          ),
                          if (question.imageUrl != null) ...[
                            const SizedBox(height: 16),
                            ClipRRect(
                              borderRadius: BorderRadius.circular(12),
                              child: CachedNetworkImage(
                                imageUrl: question.imageUrl!,
                                fit: BoxFit.contain,
                                placeholder: (_, __) => Container(
                                  height: 150,
                                  color: Colors.grey.shade100,
                                  child: const Center(
                                      child: CircularProgressIndicator()),
                                ),
                                errorWidget: (_, __, ___) =>
                                    const SizedBox.shrink(),
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Choices
                  ...question.choices.map((choice) {
                    final letter = choice.isNotEmpty ? choice[0] : '';
                    final isSelected = _selectedAnswer == choice ||
                        (_answered && choice.startsWith(_selectedAnswer?.substring(0, 1) ?? '##'));
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 10),
                      child: InkWell(
                        onTap: _answered || quiz.isLoading ? null : () => _selectAnswer(choice),
                        borderRadius: BorderRadius.circular(12),
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 250),
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: _answered
                                ? _choiceColor(choice, null)
                                : isSelected
                                    ? AppTheme.primary.withValues(alpha: 0.08)
                                    : Colors.white,
                            border: Border.all(
                              color: _answered
                                  ? _choiceBorderColor(choice, null)
                                  : isSelected
                                      ? AppTheme.primary
                                      : const Color(0xFFDDD8FF),
                              width: _answered || isSelected ? 2 : 1,
                            ),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Row(
                            children: [
                              Container(
                                width: 32,
                                height: 32,
                                decoration: BoxDecoration(
                                  color: isSelected && !_answered
                                      ? AppTheme.primary
                                      : AppTheme.primary.withValues(alpha: 0.1),
                                  shape: BoxShape.circle,
                                ),
                                child: Center(
                                  child: Text(
                                    letter,
                                    style: TextStyle(
                                      fontWeight: FontWeight.bold,
                                      color: isSelected && !_answered
                                          ? Colors.white
                                          : AppTheme.primary,
                                    ),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Text(
                                  choice.length > 3 ? choice.substring(3) : choice,
                                  style: const TextStyle(
                                    fontSize: 15,
                                    color: AppTheme.textPrimary,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    );
                  }),

                  // Result feedback
                  if (_answered && result != null) ...[
                    const SizedBox(height: 12),
                    ScaleTransition(
                      scale: _resultScale,
                      child: Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: result.isCorrect
                              ? AppTheme.success.withValues(alpha: 0.1)
                              : AppTheme.error.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: result.isCorrect
                                ? AppTheme.success
                                : AppTheme.error,
                          ),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Icon(
                                  result.isCorrect
                                      ? Icons.check_circle_rounded
                                      : Icons.cancel_rounded,
                                  color: result.isCorrect
                                      ? AppTheme.success
                                      : AppTheme.error,
                                ),
                                const SizedBox(width: 8),
                                Text(
                                  result.isCorrect ? 'Benar! 🎉' : 'Salah!',
                                  style: TextStyle(
                                    fontWeight: FontWeight.bold,
                                    fontSize: 16,
                                    color: result.isCorrect
                                        ? AppTheme.success
                                        : AppTheme.error,
                                  ),
                                ),
                              ],
                            ),
                            if (result.explanation.isNotEmpty) ...[
                              const SizedBox(height: 8),
                              Text(
                                result.explanation,
                                style: const TextStyle(
                                  fontSize: 14,
                                  color: AppTheme.textPrimary,
                                  height: 1.4,
                                ),
                              ),
                            ],
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    if (quiz.state == QuizState.active)
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton(
                          onPressed: _nextQuestion,
                          child: const Text('Soal Berikutnya'),
                        ),
                      ),
                  ],

                  if (quiz.isLoading)
                    const Padding(
                      padding: EdgeInsets.all(16),
                      child: Center(child: CircularProgressIndicator()),
                    ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _showQuitDialog(BuildContext context) async {
    final quiz = context.read<QuizProvider>();
    final router = GoRouter.of(context);
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Keluar Kuis?'),
        content: const Text('Progres kuis ini akan hilang. Yakin ingin keluar?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Batal'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.error),
            child: const Text('Keluar'),
          ),
        ],
      ),
    );
    if (confirmed == true && mounted) {
      quiz.reset();
      router.go('/home');
    }
  }
}
