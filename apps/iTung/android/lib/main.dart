import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'providers/auth_provider.dart';
import 'providers/quiz_provider.dart';
import 'services/api_service.dart';
import 'router.dart';
import 'theme.dart';

void main() {
  runApp(const ITungApp());
}

class ITungApp extends StatelessWidget {
  const ITungApp({super.key});

  @override
  Widget build(BuildContext context) {
    final apiService = ApiService();

    return MultiProvider(
      providers: [
        Provider<ApiService>.value(value: apiService),
        ChangeNotifierProvider(create: (_) => AuthProvider(apiService)),
        ChangeNotifierProvider(create: (_) => QuizProvider(apiService)),
      ],
      child: Builder(
        builder: (ctx) {
          final auth = ctx.read<AuthProvider>();
          final router = buildRouter(auth);
          return MaterialApp.router(
            title: 'iTung',
            theme: AppTheme.light,
            routerConfig: router,
            debugShowCheckedModeBanner: false,
          );
        },
      ),
    );
  }
}
