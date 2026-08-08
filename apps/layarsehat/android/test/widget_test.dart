import 'package:flutter_test/flutter_test.dart';
import 'package:layarsehat/theme.dart';

void main() {
  test('tema memakai warna merek hijau', () {
    expect(buildTheme().colorScheme.primary, kHijau);
  });
}
