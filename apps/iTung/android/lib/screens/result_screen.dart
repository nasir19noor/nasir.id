import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:percent_indicator/percent_indicator.dart';
import 'package:provider/provider.dart';
import '../providers/quiz_provider.dart';
import '../theme.dart';
import '../constants.dart';

class ResultScreen extends StatelessWidget {
  const ResultScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final quiz = context.watch<QuizProvider>();
    final session = quiz.session;
    final result = quiz.lastResult;

    if (session == null) {
      WidgetsBinding.instance.addPostFrameCallback((_) => context.go('/home'));
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    final total = session.totalQuestions;
    final correct = quiz.correctCount;
    final accuracy = total > 0 ? correct / total : 0.0;
    final perf = result?.performance;

    String emoji;
    String message;
    if (accuracy >= 0.9) {
      emoji = '🏆';
      message = 'Luar Biasa! Kamu sangat hebat!';
    } else if (accuracy >= 0.7) {
      emoji = '⭐';
      message = 'Bagus! Terus semangat belajar!';
    } else if (accuracy >= 0.5) {
      emoji = '💪';
      message = 'Lumayan! Masih bisa lebih baik!';
    } else {
      emoji = '📖';
      message = 'Jangan menyerah, terus berlatih!';
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Hasil Kuis'),
        automaticallyImplyLeading: false,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            const SizedBox(height: 16),
            Text(emoji, style: const TextStyle(fontSize: 64)),
            const SizedBox(height: 12),
            Text(
              message,
              style: Theme.of(context).textTheme.headlineSmall,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              'Topik: ${session.topic[0].toUpperCase()}${session.topic.substring(1)}',
              style: Theme.of(context).textTheme.bodyMedium,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 32),

            // Score circle
            CircularPercentIndicator(
              radius: 90,
              lineWidth: 14,
              percent: accuracy,
              center: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    '${(accuracy * 100).round()}%',
                    style: const TextStyle(
                      fontSize: 32,
                      fontWeight: FontWeight.bold,
                      color: AppTheme.textPrimary,
                    ),
                  ),
                  Text(
                    '$correct / $total benar',
                    style: const TextStyle(
                        fontSize: 13, color: AppTheme.textSecondary),
                  ),
                ],
              ),
              progressColor: accuracy >= 0.7
                  ? AppTheme.success
                  : accuracy >= 0.5
                      ? AppTheme.warning
                      : AppTheme.error,
              backgroundColor: Colors.grey.shade200,
              circularStrokeCap: CircularStrokeCap.round,
              animation: true,
              animationDuration: 1000,
            ),
            const SizedBox(height: 32),

            // Answer summary
            Card(
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Ringkasan Jawaban',
                      style: TextStyle(
                          fontSize: 16, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 12),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: List.generate(
                        quiz.answers.length,
                        (i) => Container(
                          width: 36,
                          height: 36,
                          decoration: BoxDecoration(
                            color: quiz.answers[i]
                                ? AppTheme.success.withValues(alpha: 0.15)
                                : AppTheme.error.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(
                              color: quiz.answers[i]
                                  ? AppTheme.success
                                  : AppTheme.error,
                            ),
                          ),
                          child: Center(
                            child: Icon(
                              quiz.answers[i]
                                  ? Icons.check
                                  : Icons.close,
                              size: 18,
                              color: quiz.answers[i]
                                  ? AppTheme.success
                                  : AppTheme.error,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),

            // Performance info
            if (perf != null) ...[
              const SizedBox(height: 16),
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Analisis Performa',
                        style: TextStyle(
                            fontSize: 16, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 12),
                      _InfoRow(
                        label: 'Tingkat selanjutnya',
                        value: kDifficultyLabels[perf.nextDifficulty] ??
                            perf.nextDifficulty,
                        icon: Icons.trending_up,
                        color: AppTheme.primary,
                      ),
                      if (perf.weakTopics.isNotEmpty) ...[
                        const SizedBox(height: 8),
                        _InfoRow(
                          label: 'Perlu diperkuat',
                          value: perf.weakTopics.take(3).join(', '),
                          icon: Icons.warning_amber_outlined,
                          color: AppTheme.warning,
                        ),
                      ],
                      if (perf.strongTopics.isNotEmpty) ...[
                        const SizedBox(height: 8),
                        _InfoRow(
                          label: 'Sudah mahir',
                          value: perf.strongTopics.take(3).join(', '),
                          icon: Icons.star_outline,
                          color: AppTheme.success,
                        ),
                      ],
                    ],
                  ),
                ),
              ),
            ],

            const SizedBox(height: 32),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () {
                      quiz.reset();
                      context.go('/home');
                    },
                    icon: const Icon(Icons.home_outlined),
                    label: const Text('Beranda'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: () {
                      quiz.reset();
                      context.pushReplacement('/home');
                    },
                    icon: const Icon(Icons.replay_rounded),
                    label: const Text('Main Lagi'),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: () {
                  quiz.reset();
                  context.push('/progress');
                },
                icon: const Icon(Icons.bar_chart_rounded),
                label: const Text('Lihat Progres'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final Color color;

  const _InfoRow({
    required this.label,
    required this.value,
    required this.icon,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, color: color, size: 18),
        const SizedBox(width: 8),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label,
                  style: const TextStyle(
                      fontSize: 12, color: AppTheme.textSecondary)),
              Text(value,
                  style: const TextStyle(
                      fontSize: 14, fontWeight: FontWeight.w600)),
            ],
          ),
        ),
      ],
    );
  }
}
