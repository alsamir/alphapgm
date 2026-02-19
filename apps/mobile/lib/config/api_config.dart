class ApiConfig {
  // Change this to your production API URL
  static const String baseUrl = 'https://catalog.alphapgm.com';
  static const String apiPrefix = '/api/v1';

  static String get apiUrl => '$baseUrl$apiPrefix';
}
