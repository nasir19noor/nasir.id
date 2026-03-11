import 'package:flutter/material.dart';
import 'package:percent_indicator/percent_indicator.dart';
import 'package:provider/provider.dart';
import '../models/quiz.dart';
import '../services/api_service.dart';
import '../theme.dart';

class ProgressScreen extends StatefulWidget {
  const ProgressScreen({super.key});

  @override
  State<ProgressScreen> createState() => _ProgressScreenState();
}

class _ProgressScreenState extends State<ProgressScreen> {
  UserStats? _stats;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final stats = await context.read<ApiService>().getUserStats();
      setState(() {
        _stats = stats;
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Progres Belajar'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _load,
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.error_outline,
                          color: AppTheme.error, size: 48),
                      const SizedBox(height: 12),
                      Text(_error!,
                          textAlign: TextAlign.center,
                          style: const TextStyle(color: AppTheme.textSecondary)),
                      const SizedBox(height: 16),
                      ElevatedButton(
                          onPressed: _load, child: const Text('Coba Lagi')),
                    ],
                  ),
                )
              : _buildStats(),
    );
  }

  Widget _buildStats() {
    final stats = _stats!;
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Overview cards
          Row(
            children: [
              Expanded(
                child: _StatCard(
                  label: 'Soal Dijawab',
                  value: '${stats.totalQuestions}',
                  icon: Icons.quiz_outlined,
                  color: AppTheme.primary,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _StatCard(
                  label: 'Topik Dipelajari',
                  value: '${stats.topicStats.length}',
                  icon: Icons.school_outlined,
                  color: AppTheme.success,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Row(
                children: [
                  CircularPercentIndicator(
                    radius: 45,
                    lineWidth: 8,
                    percent: stats.overallAccuracy / 100,
                    center: Text(
                      '${stats.overallAccuracy.round()}%',
                      style: const TextStyle(
                          fontWeight: FontWeight.bold, fontSize: 16),
                    ),
                    progressColor: AppTheme.primary,
                    backgroundColor: AppTheme.primary.withValues(alpha: 0.1),
                    circularStrokeCap: CircularStrokeCap.round,
                    animation: true,
                  ),
                  const SizedBox(width: 16),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Akurasi Keseluruhan',
                        style: TextStyle(
                            fontWeight: FontWeight.bold,
                            color: AppTheme.textPrimary),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        _accuracyLabel(stats.overallAccuracy),
                        style: const TextStyle(
                            color: AppTheme.textSecondary, fontSize: 13),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),

          const SizedBox(height: 24),
          Text('Performa per Topik',
              style: Theme.of(context).textTheme.headlineSmall),
          const SizedBox(height: 12),

          if (stats.topicStats.isEmpty)
            const Center(
              child: Padding(
                padding: EdgeInsets.all(32),
                child: Text(
                  'Belum ada data. Mulai kuis untuk melihat progres!',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: AppTheme.textSecondary),
                ),
              ),
            )
          else
            ...stats.topicStats.map((t) => _TopicStatCard(stat: t)),
        ],
      ),
    );
  }

  String _accuracyLabel(double acc) {
    if (acc >= 90) return 'Sangat Baik';
    if (acc >= 70) return 'Baik';
    if (acc >= 50) return 'Cukup';
    return 'Perlu Latihan';
  }
}

class _StatCard extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final Color color;

  const _StatCard({
    required this.label,
    required this.value,
    required this.icon,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, color: color, size: 28),
            const SizedBox(height: 8),
            Text(value,
                style: TextStyle(
                    fontSize: 28,
                    fontWeight: FontWeight.bold,
                    color: color)),
            const SizedBox(height: 2),
            Text(label,
                style: const TextStyle(
                    fontSize: 12, color: AppTheme.textSecondary)),
          ],
        ),
      ),
    );
  }
}

class _TopicStatCard extends StatelessWidget {
  final TopicStat stat;

  const _TopicStatCard({required this.stat});

  Color get _skillColor {
    switch (stat.skillLevel) {
      case 'ahli':
        return AppTheme.success;
      case 'mahir':
        return AppTheme.primary;
      case 'berkembang':
        return AppTheme.warning;
      default:
        return AppTheme.textSecondary;
    }
  }

  String get _skillLabel {
    switch (stat.skillLevel) {
      case 'ahli':
        return 'Ahli';
      case 'mahir':
        return 'Mahir';
      case 'berkembang':
        return 'Berkembang';
      default:
        return 'Pemula';
    }
  }

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Text(
                    stat.topic[0].toUpperCase() + stat.topic.substring(1),
                    style: const TextStyle(
                        fontWeight: FontWeight.bold, fontSize: 15),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: _skillColor.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: _skillColor),
                  ),
                  child: Text(
                    _skillLabel,
                    style: TextStyle(
                        color: _skillColor,
                        fontSize: 11,
                        fontWeight: FontWeight.bold),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            LinearPercentIndicator(
              lineHeight: 8,
              percent: (stat.accuracy / 100).clamp(0.0, 1.0),
              backgroundColor: Colors.grey.shade200,
              progressColor: _skillColor,
              barRadius: const Radius.circular(4),
              padding: EdgeInsets.zero,
            ),
            const SizedBox(height: 6),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  '${stat.correct}/${stat.questions} benar',
                  style: const TextStyle(
                      fontSize: 12, color: AppTheme.textSecondary),
                ),
                Text(
                  '${stat.accuracy.round()}%',
                  style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.bold,
                      color: _skillColor),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
