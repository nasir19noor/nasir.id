import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../services/api_service.dart';
import '../theme.dart';

class GoogleRegisterScreen extends StatefulWidget {
  final String idToken;
  final String googleEmail;
  final String googleName;

  const GoogleRegisterScreen({
    super.key,
    required this.idToken,
    required this.googleEmail,
    required this.googleName,
  });

  @override
  State<GoogleRegisterScreen> createState() => _GoogleRegisterScreenState();
}

class _GoogleRegisterScreenState extends State<GoogleRegisterScreen> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _usernameCtrl;
  late final TextEditingController _fullNameCtrl;
  final _phoneCtrl = TextEditingController();
  final _otpCtrl = TextEditingController();
  DateTime? _birthDate;
  bool _otpSent = false;
  bool _sendingOtp = false;
  String? _otpError;

  @override
  void initState() {
    super.initState();
    _usernameCtrl = TextEditingController();
    _fullNameCtrl = TextEditingController(text: widget.googleName);
  }

  @override
  void dispose() {
    _usernameCtrl.dispose();
    _fullNameCtrl.dispose();
    _phoneCtrl.dispose();
    _otpCtrl.dispose();
    super.dispose();
  }

  Future<void> _pickDate() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: DateTime(now.year - 10),
      firstDate: DateTime(1950),
      lastDate: now,
      helpText: 'Pilih Tanggal Lahir',
    );
    if (picked != null) setState(() => _birthDate = picked);
  }

  Future<void> _sendOtp() async {
    final phone = _phoneCtrl.text.trim();
    if (phone.isEmpty) {
      setState(() => _otpError = 'Masukkan nomor WhatsApp terlebih dahulu.');
      return;
    }
    setState(() {
      _sendingOtp = true;
      _otpError = null;
    });
    try {
      await context.read<ApiService>().sendOtp(phone);
      setState(() {
        _otpSent = true;
        _sendingOtp = false;
      });
    } on ApiException catch (e) {
      setState(() {
        _otpError = e.message;
        _sendingOtp = false;
      });
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (!_otpSent) {
      setState(() => _otpError = 'Verifikasi nomor WhatsApp terlebih dahulu.');
      return;
    }
    final auth = context.read<AuthProvider>();
    auth.clearError();
    final birthDate = _birthDate != null
        ? '${_birthDate!.year}-${_birthDate!.month.toString().padLeft(2, '0')}-${_birthDate!.day.toString().padLeft(2, '0')}'
        : '';
    final ok = await auth.completeGoogleRegister(
      idToken: widget.idToken,
      username: _usernameCtrl.text.trim(),
      fullName: _fullNameCtrl.text.trim(),
      birthDate: birthDate,
      phoneNumber: _phoneCtrl.text.trim(),
      otpCode: _otpCtrl.text.trim(),
    );
    if (ok && mounted) context.go('/home');
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();

    return Scaffold(
      appBar: AppBar(title: const Text('Lengkapi Data')),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Google account info
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppTheme.primary.withValues(alpha: 0.08),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                        color: AppTheme.primary.withValues(alpha: 0.2)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.account_circle,
                          color: AppTheme.primary, size: 36),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              widget.googleName.isNotEmpty
                                  ? widget.googleName
                                  : 'Akun Google',
                              style: const TextStyle(
                                  fontWeight: FontWeight.bold,
                                  color: AppTheme.textPrimary),
                            ),
                            Text(
                              widget.googleEmail,
                              style: const TextStyle(
                                  fontSize: 13,
                                  color: AppTheme.textSecondary),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Satu langkah lagi! Lengkapi data untuk akun iTung kamu.',
                  style: Theme.of(context).textTheme.bodyMedium,
                ),
                const SizedBox(height: 20),

                TextFormField(
                  controller: _usernameCtrl,
                  decoration: const InputDecoration(
                    labelText: 'Username',
                    prefixIcon: Icon(Icons.person_outline),
                  ),
                  textInputAction: TextInputAction.next,
                  validator: (v) {
                    if (v == null || v.trim().isEmpty) return 'Username wajib diisi';
                    if (v.trim().length < 3) return 'Minimal 3 karakter';
                    return null;
                  },
                ),
                const SizedBox(height: 12),

                TextFormField(
                  controller: _fullNameCtrl,
                  decoration: const InputDecoration(
                    labelText: 'Nama Lengkap',
                    prefixIcon: Icon(Icons.badge_outlined),
                  ),
                  textInputAction: TextInputAction.next,
                  validator: (v) =>
                      (v == null || v.trim().isEmpty) ? 'Nama wajib diisi' : null,
                ),
                const SizedBox(height: 12),

                InkWell(
                  onTap: _pickDate,
                  child: InputDecorator(
                    decoration: const InputDecoration(
                      labelText: 'Tanggal Lahir',
                      prefixIcon: Icon(Icons.cake_outlined),
                    ),
                    child: Text(
                      _birthDate != null
                          ? '${_birthDate!.day}/${_birthDate!.month}/${_birthDate!.year}'
                          : 'Pilih tanggal lahir',
                      style: TextStyle(
                        color: _birthDate != null
                            ? AppTheme.textPrimary
                            : AppTheme.textSecondary,
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 12),

                // Phone + Send OTP
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: TextFormField(
                        controller: _phoneCtrl,
                        decoration: const InputDecoration(
                          labelText: 'Nomor WhatsApp',
                          prefixIcon: Icon(Icons.phone_outlined),
                          hintText: '08xxxxxxxxxx',
                        ),
                        keyboardType: TextInputType.phone,
                        textInputAction: TextInputAction.done,
                        onChanged: (_) => setState(() => _otpSent = false),
                        validator: (v) =>
                            (v == null || v.trim().isEmpty)
                                ? 'Nomor HP wajib diisi'
                                : null,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Padding(
                      padding: const EdgeInsets.only(top: 4),
                      child: ElevatedButton(
                        onPressed: _sendingOtp ? null : _sendOtp,
                        style: ElevatedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 12, vertical: 14),
                          backgroundColor: AppTheme.success,
                          textStyle: const TextStyle(fontSize: 13),
                        ),
                        child: _sendingOtp
                            ? const SizedBox(
                                width: 16,
                                height: 16,
                                child: CircularProgressIndicator(
                                    strokeWidth: 2, color: Colors.white),
                              )
                            : Text(_otpSent ? 'Kirim\nUlang' : 'Kirim\nOTP',
                                textAlign: TextAlign.center),
                      ),
                    ),
                  ],
                ),
                if (_otpError != null) ...[
                  const SizedBox(height: 4),
                  Text(_otpError!,
                      style: const TextStyle(
                          color: AppTheme.error, fontSize: 12)),
                ],
                if (_otpSent) ...[
                  const SizedBox(height: 8),
                  Text(
                    'Kode OTP telah dikirim ke WhatsApp ${_phoneCtrl.text}',
                    style: const TextStyle(
                        color: AppTheme.success, fontSize: 12),
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _otpCtrl,
                    decoration: const InputDecoration(
                      labelText: 'Kode OTP',
                      prefixIcon: Icon(Icons.lock_clock_outlined),
                      hintText: '6 digit kode',
                    ),
                    keyboardType: TextInputType.number,
                    maxLength: 6,
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                        letterSpacing: 8,
                        fontSize: 20,
                        fontWeight: FontWeight.bold),
                    validator: (v) {
                      if (!_otpSent) return null;
                      if (v == null || v.length < 6) return 'Masukkan 6 digit OTP';
                      return null;
                    },
                  ),
                ],

                if (auth.error != null) ...[
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppTheme.error.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(auth.error!,
                        style:
                            const TextStyle(color: AppTheme.error, fontSize: 13)),
                  ),
                ],

                const SizedBox(height: 24),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: auth.loading ? null : _submit,
                    child: auth.loading
                        ? const SizedBox(
                            height: 20,
                            width: 20,
                            child: CircularProgressIndicator(
                                strokeWidth: 2, color: Colors.white),
                          )
                        : const Text('Mulai Belajar'),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
