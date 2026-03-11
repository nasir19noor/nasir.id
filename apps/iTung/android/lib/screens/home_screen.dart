import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../providers/quiz_provider.dart';
import '../services/api_service.dart';
import '../theme.dart';
import '../constants.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  Map<String, List<String>> _topicsByGrade = {};
  bool _loadingTopics = true;
  String? _selectedTopic;
  int _totalQuestions = 5;
  bool _useAi = true;
  String _difficulty = 'adaptif';
  String _selectedGrade = 'Dasar';

  @override
  void initState() {
    super.initState();
    _loadTopics();
  }

  Future<void> _loadTopics() async {
    try {
      final api = context.read<ApiService>();
      final data = await api.getTopics();
      final raw = data['topics_by_grade'] as Map<String, dynamic>;
      setState(() {
        _topicsByGrade = raw.map(
          (k, v) => MapEntry(k, List<String>.from(v as List)),
        );
        _loadingTopics = false;
        if (_topicsByGrade.isNotEmpty) {
          _selectedGrade = _topicsByGrade.keys.first;
          if (_topicsByGrade[_selectedGrade]!.isNotEmpty) {
            _selectedTopic = _topicsByGrade[_selectedGrade]!.first;
          }
        }
      });
    } catch (_) {
      setState(() => _loadingTopics = false);
    }
  }

  Future<void> _startQuiz() async {
    if (_selectedTopic == null) return;
    final quiz = context.read<QuizProvider>();
    quiz.reset();
    final ok = await quiz.startQuiz(
      topic: _selectedTopic!,
      totalQuestions: _totalQuestions,
      useAi: _useAi,
      difficultyLevel: _difficulty,
    );
    if (ok && mounted) context.push('/quiz');
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final quiz = context.watch<QuizProvider>();
    final user = auth.user;

    return Scaffold(
      appBar: AppBar(
        title: const Text('iTung'),
        actions: [
          IconButton(
            icon: const Icon(Icons.bar_chart_rounded),
            onPressed: () => context.push('/progress'),
            tooltip: 'Progres',
          ),
          IconButton(
            icon: const Icon(Icons.person_outline),
            onPressed: () => context.push('/profile'),
            tooltip: 'Profil',
          ),
        ],
      ),
      body: _loadingTopics
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Greeting
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [AppTheme.primary, AppTheme.primaryDark],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      borderRadius: BorderRadius.circular(20),
                      boxShadow: [
                        BoxShadow(
                          color: AppTheme.primary.withValues(alpha: 0.3),
                          blurRadius: 12,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Hai, ${user?.displayName ?? 'Pelajar'}! 👋',
                                style: const TextStyle(
                                  fontSize: 20,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.white,
                                ),
                              ),
                              const SizedBox(height: 4),
                              const Text(
                                'Siap belajar matematika hari ini?',
                                style: TextStyle(
                                  fontSize: 14,
                                  color: Colors.white70,
                                ),
                              ),
                            ],
                          ),
                        ),
                        const Text('📚', style: TextStyle(fontSize: 40)),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),

                  Text('Mulai Kuis', style: Theme.of(context).textTheme.headlineSmall),
                  const SizedBox(height: 16),

                  // Grade tabs
                  if (_topicsByGrade.isNotEmpty) ...[
                    SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      child: Row(
                        children: _topicsByGrade.keys.map((grade) {
                          final selected = grade == _selectedGrade;
                          return Padding(
                            padding: const EdgeInsets.only(right: 8),
                            child: ChoiceChip(
                              label: Text(grade),
                              selected: selected,
                              onSelected: (_) {
                                setState(() {
                                  _selectedGrade = grade;
                                  _selectedTopic = _topicsByGrade[grade]!.first;
                                });
                              },
                              selectedColor: AppTheme.primary,
                              labelStyle: TextStyle(
                                color: selected ? Colors.white : AppTheme.textPrimary,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          );
                        }).toList(),
                      ),
                    ),
                    const SizedBox(height: 12),

                    // Topic dropdown
                    DropdownButtonFormField<String>(
                      initialValue: _selectedTopic,
                      decoration: const InputDecoration(
                        labelText: 'Pilih Topik',
                        prefixIcon: Icon(Icons.topic_outlined),
                      ),
                      items: (_topicsByGrade[_selectedGrade] ?? [])
                          .map((t) => DropdownMenuItem(
                                value: t,
                                child: Text(
                                  t[0].toUpperCase() + t.substring(1),
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ))
                          .toList(),
                      onChanged: (v) => setState(() => _selectedTopic = v),
                    ),
                    const SizedBox(height: 12),
                  ],

                  // Difficulty
                  DropdownButtonFormField<String>(
                    initialValue: _difficulty,
                    decoration: const InputDecoration(
                      labelText: 'Tingkat Kesulitan',
                      prefixIcon: Icon(Icons.speed_outlined),
                    ),
                    items: kDifficultyLabels.entries
                        .map((e) => DropdownMenuItem(
                              value: e.key,
                              child: Text(
                                  '${kDifficultyEmoji[e.key]} ${e.value}'),
                            ))
                        .toList(),
                    onChanged: (v) => setState(() => _difficulty = v!),
                  ),
                  const SizedBox(height: 12),

                  // Total questions
                  Row(
                    children: [
                      const Icon(Icons.quiz_outlined, color: AppTheme.textSecondary),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Jumlah Soal: $_totalQuestions',
                              style: const TextStyle(
                                  fontWeight: FontWeight.w600,
                                  color: AppTheme.textPrimary),
                            ),
                            Slider(
                              value: _totalQuestions.toDouble(),
                              min: 3,
                              max: 20,
                              divisions: 17,
                              activeColor: AppTheme.primary,
                              label: '$_totalQuestions',
                              onChanged: (v) =>
                                  setState(() => _totalQuestions = v.round()),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),

                  // Use AI toggle
                  SwitchListTile(
                    value: _useAi,
                    onChanged: (v) => setState(() => _useAi = v),
                    title: const Text('Gunakan AI',
                        style: TextStyle(fontWeight: FontWeight.w600)),
                    subtitle: const Text('Soal dibuat oleh AI secara dinamis'),
                    activeThumbColor: AppTheme.primary,
                    contentPadding: EdgeInsets.zero,
                  ),
                  const SizedBox(height: 24),

                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      onPressed: (quiz.isLoading || _selectedTopic == null)
                          ? null
                          : _startQuiz,
                      icon: quiz.isLoading
                          ? const SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(
                                  strokeWidth: 2, color: Colors.white),
                            )
                          : const Icon(Icons.play_arrow_rounded),
                      label: Text(quiz.isLoading ? 'Menyiapkan...' : 'Mulai Kuis'),
                      style: ElevatedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        textStyle: const TextStyle(
                            fontSize: 18, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ),
                  if (quiz.error != null) ...[
                    const SizedBox(height: 12),
                    Text(
                      quiz.error!,
                      style: const TextStyle(color: AppTheme.error),
                      textAlign: TextAlign.center,
                    ),
                  ],
                ],
              ),
            ),
    );
  }
}
