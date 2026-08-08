import 'package:flutter/material.dart';

const Color kHijau = Color(0xFF17876D);
const Color kHijauTua = Color(0xFF0F5F4C);
const Color kHijauMuda = Color(0xFFE6F5F0);
const Color kLatar = Color(0xFFF6F9F8);
const Color kTeks = Color(0xFF16201D);
const Color kTeksLembut = Color(0xFF5C6B66);
const Color kMerah = Color(0xFFC0392B);
const Color kKuning = Color(0xFFB7791F);

/// Kartu putih bergaris tipis — dipakai di seluruh layar.
class Kartu extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry padding;

  const Kartu({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(18),
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: padding,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFDFE7E4)),
      ),
      child: child,
    );
  }
}

ThemeData buildTheme() {
  final base = ThemeData.light(useMaterial3: true);
  return base.copyWith(
    colorScheme: ColorScheme.fromSeed(seedColor: kHijau).copyWith(
      primary: kHijau,
      surface: Colors.white,
    ),
    scaffoldBackgroundColor: kLatar,
    appBarTheme: const AppBarTheme(
      backgroundColor: Colors.white,
      foregroundColor: kTeks,
      elevation: 0,
      centerTitle: false,
      titleTextStyle: TextStyle(
        color: kTeks,
        fontSize: 18,
        fontWeight: FontWeight.w700,
      ),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: kHijau,
        foregroundColor: Colors.white,
        elevation: 0,
        padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 20),
        textStyle: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: Colors.white,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: const BorderSide(color: Color(0xFFDFE7E4)),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: const BorderSide(color: Color(0xFFDFE7E4)),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: const BorderSide(color: kHijau, width: 2),
      ),
    ),
  );
}
