const String kBaseUrl = 'https://api.itung.nasir.id';
// For local dev: 'http://10.0.2.2:9000'

const String kGoogleClientId =
    '943652190384-emo9evfro4d5n6rpabn1artu2brmtm9m.apps.googleusercontent.com';

const String kTokenKey = 'itung_token';
const String kUserKey = 'itung_user';

const Map<String, String> kDifficultyLabels = {
  'sangat_mudah': 'Sangat Mudah',
  'mudah': 'Mudah',
  'sedang': 'Sedang',
  'sulit': 'Sulit',
  'sangat_sulit': 'Sangat Sulit',
  'adaptif': 'Adaptif',
};

const Map<String, String> kDifficultyEmoji = {
  'sangat_mudah': '⭐',
  'mudah': '⭐⭐',
  'sedang': '⭐⭐⭐',
  'sulit': '⭐⭐⭐⭐',
  'sangat_sulit': '⭐⭐⭐⭐⭐',
  'adaptif': '🎯',
};
