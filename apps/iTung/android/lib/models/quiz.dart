class Question {
  final int id;
  final String question;
  final List<String> choices;
  final String difficulty;
  final String? imageUrl;
  final int number;

  const Question({
    required this.id,
    required this.question,
    required this.choices,
    required this.difficulty,
    this.imageUrl,
    required this.number,
  });

  factory Question.fromJson(Map<String, dynamic> json) => Question(
        id: json['id'] as int,
        question: json['question'] as String,
        choices: List<String>.from(json['choices'] as List),
        difficulty: json['difficulty'] as String? ?? 'sedang',
        imageUrl: json['image_url'] as String?,
        number: json['number'] as int? ?? 1,
      );
}

class QuizSession {
  final int sessionId;
  final String topic;
  final int totalQuestions;
  final bool useAi;
  final Question firstQuestion;

  const QuizSession({
    required this.sessionId,
    required this.topic,
    required this.totalQuestions,
    required this.useAi,
    required this.firstQuestion,
  });

  factory QuizSession.fromJson(Map<String, dynamic> json) => QuizSession(
        sessionId: json['session_id'] as int,
        topic: json['topic'] as String,
        totalQuestions: json['total_questions'] as int,
        useAi: json['use_ai'] as bool? ?? true,
        firstQuestion: Question.fromJson(json['first_question'] as Map<String, dynamic>),
      );
}

class Performance {
  final int total;
  final int correct;
  final double accuracy;
  final List<String> weakTopics;
  final List<String> strongTopics;
  final String nextDifficulty;

  const Performance({
    required this.total,
    required this.correct,
    required this.accuracy,
    required this.weakTopics,
    required this.strongTopics,
    required this.nextDifficulty,
  });

  factory Performance.fromJson(Map<String, dynamic> json) => Performance(
        total: json['total'] as int? ?? 0,
        correct: json['correct'] as int? ?? 0,
        accuracy: (json['accuracy'] as num?)?.toDouble() ?? 0.0,
        weakTopics: List<String>.from(json['weak_topics'] as List? ?? []),
        strongTopics: List<String>.from(json['strong_topics'] as List? ?? []),
        nextDifficulty: json['next_difficulty'] as String? ?? 'sedang',
      );
}

class AnswerResult {
  final bool isCorrect;
  final String explanation;
  final int sessionScore;
  final Question? nextQuestion;
  final Performance performance;

  const AnswerResult({
    required this.isCorrect,
    required this.explanation,
    required this.sessionScore,
    this.nextQuestion,
    required this.performance,
  });

  factory AnswerResult.fromJson(Map<String, dynamic> json) => AnswerResult(
        isCorrect: json['is_correct'] as bool,
        explanation: json['explanation'] as String? ?? '',
        sessionScore: json['session_score'] as int? ?? 0,
        nextQuestion: json['next_question'] != null
            ? Question.fromJson(json['next_question'] as Map<String, dynamic>)
            : null,
        performance: Performance.fromJson(json['performance'] as Map<String, dynamic>),
      );
}

class UserStats {
  final int totalSessions;
  final int totalQuestions;
  final double overallAccuracy;
  final List<TopicStat> topicStats;

  const UserStats({
    required this.totalSessions,
    required this.totalQuestions,
    required this.overallAccuracy,
    required this.topicStats,
  });

  factory UserStats.fromJson(Map<String, dynamic> json) => UserStats(
        totalSessions: json['total_sessions'] as int? ?? 0,
        totalQuestions: json['total_questions'] as int? ?? 0,
        // Backend sends 0.0–1.0, convert to 0–100
        overallAccuracy: ((json['overall_accuracy'] as num?)?.toDouble() ?? 0.0) * 100,
        // Backend key is 'topics', not 'topic_stats'
        topicStats: (json['topics'] as List? ?? [])
            .map((e) => TopicStat.fromJson(e as Map<String, dynamic>))
            .toList(),
      );
}

class TopicStat {
  final String topic;
  final int questions;
  final int correct;
  final double accuracy;
  final String skillLevel;

  const TopicStat({
    required this.topic,
    required this.questions,
    required this.correct,
    required this.accuracy,
    required this.skillLevel,
  });

  factory TopicStat.fromJson(Map<String, dynamic> json) => TopicStat(
        topic: json['topic'] as String,
        questions: json['questions'] as int? ?? 0,
        correct: json['correct'] as int? ?? 0,
        // Backend sends 0.0–1.0, convert to 0–100
        accuracy: ((json['accuracy'] as num?)?.toDouble() ?? 0.0) * 100,
        skillLevel: json['skill_level'] as String? ?? 'pemula',
      );
}
