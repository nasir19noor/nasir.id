import 'package:go_router/go_router.dart';
import 'providers/auth_provider.dart';
import 'screens/splash_screen.dart';
import 'screens/login_screen.dart';
import 'screens/register_screen.dart';
import 'screens/home_screen.dart';
import 'screens/quiz_screen.dart';
import 'screens/result_screen.dart';
import 'screens/progress_screen.dart';
import 'screens/profile_screen.dart';
import 'screens/google_register_screen.dart';

GoRouter buildRouter(AuthProvider auth) => GoRouter(
      initialLocation: '/',
      redirect: (context, state) {
        final loggedIn = auth.isAuthenticated;
        final onPublic = state.matchedLocation == '/login' ||
            state.matchedLocation == '/register' ||
            state.matchedLocation == '/' ||
            state.matchedLocation.startsWith('/google-register');
        if (!loggedIn && !onPublic) return '/login';
        return null;
      },
      refreshListenable: auth,
      routes: [
        GoRoute(path: '/', builder: (_, __) => const SplashScreen()),
        GoRoute(path: '/login', builder: (_, __) => const LoginScreen()),
        GoRoute(path: '/register', builder: (_, __) => const RegisterScreen()),
        GoRoute(
          path: '/google-register',
          builder: (_, state) {
            final extra = state.extra as Map<String, String>? ?? {};
            return GoogleRegisterScreen(
              idToken: extra['idToken'] ?? '',
              googleEmail: extra['email'] ?? '',
              googleName: extra['name'] ?? '',
            );
          },
        ),
        GoRoute(path: '/home', builder: (_, __) => const HomeScreen()),
        GoRoute(path: '/quiz', builder: (_, __) => const QuizScreen()),
        GoRoute(path: '/result', builder: (_, __) => const ResultScreen()),
        GoRoute(path: '/progress', builder: (_, __) => const ProgressScreen()),
        GoRoute(path: '/profile', builder: (_, __) => const ProfileScreen()),
      ],
    );
