# iTung Android (Flutter)

Aplikasi Android untuk iTung - Kuis Matematika Anak Indonesia.

## Prasyarat

- Flutter SDK >= 3.0.0
- Android Studio / VS Code
- Android device/emulator (API 21+)

## Setup

```bash
cd android
flutter pub get
flutter run
```

## Konfigurasi API

Edit `lib/constants.dart` dan ubah `kBaseUrl`:

```dart
// Production
const String kBaseUrl = 'https://itung-api.nasir.id';

// Local development
// const String kBaseUrl = 'http://10.0.2.2:9000';
```

## Struktur

```
lib/
  main.dart           # Entry point
  router.dart         # Routing (go_router)
  theme.dart          # Tema & warna
  constants.dart      # Konstanta (base URL, dll)
  models/
    user.dart         # Model User
    quiz.dart         # Model Quiz, Question, dll
  providers/
    auth_provider.dart  # State autentikasi
    quiz_provider.dart  # State kuis aktif
  screens/
    splash_screen.dart
    login_screen.dart
    register_screen.dart
    home_screen.dart    # Pilih topik & mulai kuis
    quiz_screen.dart    # Tampilan soal
    result_screen.dart  # Hasil kuis
    progress_screen.dart
    profile_screen.dart
  services/
    api_service.dart    # HTTP client ke backend
```

## Build APK

```bash
flutter build apk --release
# Output: build/app/outputs/flutter-apk/app-release.apk
```
