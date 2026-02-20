import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import '../config/api_config.dart';

class ApiException implements Exception {
  final String message;
  final int statusCode;
  final dynamic data;

  ApiException(this.message, this.statusCode, [this.data]);

  @override
  String toString() => message;
}

class ApiService {
  final String _baseUrl = ApiConfig.apiUrl;

  Map<String, String> _headers({String? token}) {
    final headers = {'Content-Type': 'application/json'};
    if (token != null) {
      headers['Authorization'] = 'Bearer $token';
    }
    return headers;
  }

  Future<Map<String, dynamic>> _request(
    String method,
    String endpoint, {
    String? token,
    Map<String, dynamic>? body,
    Map<String, String>? queryParams,
  }) async {
    var uri = Uri.parse('$_baseUrl$endpoint');
    if (queryParams != null && queryParams.isNotEmpty) {
      uri = uri.replace(queryParameters: queryParams);
    }

    late http.Response response;

    switch (method) {
      case 'GET':
        response = await http.get(uri, headers: _headers(token: token));
        break;
      case 'POST':
        response = await http.post(uri, headers: _headers(token: token), body: body != null ? jsonEncode(body) : null);
        break;
      case 'PUT':
        response = await http.put(uri, headers: _headers(token: token), body: body != null ? jsonEncode(body) : null);
        break;
      case 'DELETE':
        response = await http.delete(uri, headers: _headers(token: token));
        break;
      default:
        throw ApiException('Unsupported method', 0);
    }

    final data = jsonDecode(response.body);

    if (response.statusCode >= 400) {
      throw ApiException(
        data['message'] ?? 'Request failed',
        response.statusCode,
        data,
      );
    }

    return data;
  }

  // Auth
  Future<Map<String, dynamic>> login(String email, String password) async {
    return _request('POST', '/auth/login', body: {'email': email, 'password': password});
  }

  Future<Map<String, dynamic>> register(Map<String, dynamic> data) async {
    return _request('POST', '/auth/register', body: data);
  }

  Future<Map<String, dynamic>> getMe(String token) async {
    return _request('GET', '/auth/me', token: token);
  }

  Future<Map<String, dynamic>> verifyEmail(String verificationToken) async {
    return _request('GET', '/auth/verify-email', queryParams: {'token': verificationToken});
  }

  // Converters
  Future<Map<String, dynamic>> searchConverters(Map<String, String> params, {String? token}) async {
    return _request('GET', '/converters', token: token, queryParams: params);
  }

  Future<Map<String, dynamic>> getConverter(int id, String token) async {
    return _request('GET', '/converters/$id', token: token);
  }

  Future<Map<String, dynamic>> getBrands({String? token}) async {
    return _request('GET', '/converters/brands', token: token);
  }

  // Pricing
  Future<Map<String, dynamic>> getMetalPrices() async {
    return _request('GET', '/pricing/metals');
  }

  // Credits
  Future<Map<String, dynamic>> getCreditBalance(String token) async {
    return _request('GET', '/credits/balance', token: token);
  }

  Future<Map<String, dynamic>> getCreditLedger(String token, {int? page}) async {
    final params = <String, String>{};
    if (page != null) params['page'] = page.toString();
    return _request('GET', '/credits/ledger', token: token, queryParams: params);
  }

  // Price Lists
  Future<Map<String, dynamic>> getPriceLists(String token) async {
    return _request('GET', '/pricelists', token: token);
  }

  Future<Map<String, dynamic>> getPriceList(int id, String token) async {
    return _request('GET', '/pricelists/$id', token: token);
  }

  Future<Map<String, dynamic>> createPriceList(String name, String token) async {
    return _request('POST', '/pricelists', token: token, body: {'name': name});
  }

  Future<Map<String, dynamic>> deletePriceList(int id, String token) async {
    return _request('DELETE', '/pricelists/$id', token: token);
  }

  Future<Map<String, dynamic>> addPriceListItem(int priceListId, int converterId, int quantity, String token) async {
    return _request('POST', '/pricelists/$priceListId/items', token: token, body: {
      'converterId': converterId,
      'quantity': quantity,
    });
  }

  Future<Map<String, dynamic>> updatePriceListItemQuantity(int priceListId, int itemId, int quantity, String token) async {
    return _request('PUT', '/pricelists/$priceListId/items/$itemId', token: token, body: {'quantity': quantity});
  }

  Future<Map<String, dynamic>> removePriceListItem(int priceListId, int itemId, String token) async {
    return _request('DELETE', '/pricelists/$priceListId/items/$itemId', token: token);
  }

  Future<List<int>> exportPriceList(int priceListId, String token) async {
    final uri = Uri.parse('$_baseUrl/pricelists/$priceListId/export');
    final response = await http.get(uri, headers: {'Authorization': 'Bearer $token'});
    if (response.statusCode >= 400) {
      throw ApiException('Export failed', response.statusCode);
    }
    return response.bodyBytes.toList();
  }

  // AI Chat
  Future<Map<String, dynamic>> sendAiMessage(String message, int? chatId, String token) async {
    return _request('POST', '/ai/chat', token: token, body: {
      'message': message,
      if (chatId != null) 'chatId': chatId,
    });
  }

  Future<Map<String, dynamic>> getAiHistory(String token) async {
    return _request('GET', '/ai/history', token: token);
  }

  // AI Image Identification
  Future<Map<String, dynamic>> identifyConverterByImage(File imageFile, String token, {String? message}) async {
    final uri = Uri.parse('$_baseUrl/ai/identify');
    final request = http.MultipartRequest('POST', uri);
    request.headers['Authorization'] = 'Bearer $token';
    request.files.add(await http.MultipartFile.fromPath('image', imageFile.path));
    if (message != null && message.isNotEmpty) {
      request.fields['message'] = message;
    }

    final streamResponse = await request.send();
    final response = await http.Response.fromStream(streamResponse);
    final data = jsonDecode(response.body);

    if (response.statusCode >= 400) {
      throw ApiException(data['message'] ?? 'Upload failed', response.statusCode, data);
    }
    return data;
  }

  // User Profile
  Future<Map<String, dynamic>> getProfile(String token) async {
    return _request('GET', '/users/profile', token: token);
  }

  Future<Map<String, dynamic>> updateProfile(Map<String, dynamic> data, String token) async {
    return _request('PUT', '/users/profile', token: token, body: data);
  }

  Future<Map<String, dynamic>> updateSettings(Map<String, dynamic> data, String token) async {
    return _request('PUT', '/users/settings', token: token, body: data);
  }

  // Admin
  Future<Map<String, dynamic>> getAdminDashboard(String token) async {
    return _request('GET', '/admin/dashboard', token: token);
  }

  Future<Map<String, dynamic>> listUsers(Map<String, String> params, String token) async {
    return _request('GET', '/users', token: token, queryParams: params);
  }

  Future<Map<String, dynamic>> getUserHistory(int userId, String token) async {
    return _request('GET', '/admin/users/$userId/history', token: token);
  }

  Future<Map<String, dynamic>> adjustUserCredits(int userId, int amount, String reason, String token) async {
    return _request('POST', '/admin/credits/adjust', token: token, body: {
      'userId': userId,
      'amount': amount,
      'reason': reason,
    });
  }

  Future<Map<String, dynamic>> getAdminTopConverters(String token) async {
    return _request('GET', '/admin/analytics/top-converters', token: token);
  }

  Future<Map<String, dynamic>> getAdminSearchVolume(String token) async {
    return _request('GET', '/admin/analytics/search-volume', token: token);
  }

  Future<Map<String, dynamic>> getAdminActiveUsers(String token) async {
    return _request('GET', '/admin/analytics/active-users', token: token);
  }

  // Admin - Activity by Country
  Future<Map<String, dynamic>> getActivityByCountry(String token) async {
    return _request('GET', '/admin/analytics/activity-by-country', token: token);
  }

  // Admin - User Locations
  Future<Map<String, dynamic>> getUserLocations(String token) async {
    return _request('GET', '/admin/analytics/user-locations', token: token);
  }

  // Admin - AI Image Uploads
  Future<Map<String, dynamic>> getAiUploads(String token) async {
    return _request('GET', '/admin/ai-uploads', token: token);
  }

  Future<Map<String, dynamic>> getSiteSettings() async {
    return _request('GET', '/settings');
  }

  Future<Map<String, dynamic>> updateSiteSettings(Map<String, dynamic> data, String token) async {
    return _request('PUT', '/settings', token: token, body: data);
  }

  Future<Map<String, dynamic>> resetUserPassword(int userId, String? password, String token) async {
    return _request('POST', '/admin/users/$userId/reset-password', token: token, body: {
      if (password != null) 'password': password,
    });
  }

  // Image URL helpers
  String getThumbnailUrl(int converterId) {
    return '${ApiConfig.baseUrl}/api/v1/images/thumb/$converterId';
  }

  String getImageUrl(int converterId, String token) {
    return '${ApiConfig.baseUrl}/api/v1/images/$converterId?token=$token';
  }
}
