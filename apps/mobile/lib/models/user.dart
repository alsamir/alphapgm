class User {
  final int id;
  final String email;
  final String? username;
  final String? name;
  final String? firstName;
  final String? lastName;
  final List<String> roles;
  final String? language;

  User({
    required this.id,
    required this.email,
    this.username,
    this.name,
    this.firstName,
    this.lastName,
    this.roles = const [],
    this.language,
  });

  bool get isAdmin => roles.contains('ROLE_ADMIN');

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'] ?? 0,
      email: json['email'] ?? '',
      username: json['username'],
      name: json['name'],
      firstName: json['firstName'],
      lastName: json['lastName'],
      roles: List<String>.from(json['roles'] ?? []),
      language: json['language'],
    );
  }
}
