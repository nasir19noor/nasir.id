class User {
  final int id;
  final String username;
  final String email;
  final String? fullName;
  final String? phoneNumber;
  final bool isActive;
  final bool isAdmin;
  final bool aiAccess;
  final String? birthDate;
  final String? avatarUrl;
  final String? cartoonUrl;

  const User({
    required this.id,
    required this.username,
    required this.email,
    this.fullName,
    this.phoneNumber,
    required this.isActive,
    required this.isAdmin,
    required this.aiAccess,
    this.birthDate,
    this.avatarUrl,
    this.cartoonUrl,
  });

  factory User.fromJson(Map<String, dynamic> json) => User(
        id: json['id'] as int,
        username: json['username'] as String,
        email: json['email'] as String,
        fullName: json['full_name'] as String?,
        phoneNumber: json['phone_number'] as String?,
        isActive: json['is_active'] as bool? ?? true,
        isAdmin: json['is_admin'] as bool? ?? false,
        aiAccess: json['ai_access'] as bool? ?? false,
        birthDate: json['birth_date'] as String?,
        avatarUrl: json['avatar_url'] as String?,
        cartoonUrl: json['cartoon_url'] as String?,
      );

  String get displayName => fullName ?? username;
}
