import 'package:flutter/material.dart';
import '../models/user.dart';
import '../services/api_service.dart';
import '../services/storage_service.dart';

class AuthProvider extends ChangeNotifier {
  final ApiService _api = ApiService();

  User? _user;
  String? _token;
  bool _isLoading = true;
  bool _isAuthenticated = false;

  User? get user => _user;
  String? get token => _token;
  bool get isLoading => _isLoading;
  bool get isAuthenticated => _isAuthenticated;
  bool get isAdmin => _user?.isAdmin ?? false;

  AuthProvider() {
    _initAuth();
  }

  Future<void> _initAuth() async {
    _isLoading = true;
    notifyListeners();

    final savedToken = await StorageService.getToken();
    if (savedToken != null) {
      try {
        final res = await _api.getMe(savedToken);
        if (res['success'] == true && res['data'] != null) {
          _user = User.fromJson(res['data']);
          _token = savedToken;
          _isAuthenticated = true;
        }
      } catch (e) {
        await StorageService.clearAll();
      }
    }

    _isLoading = false;
    notifyListeners();
  }

  Future<void> login(String email, String password) async {
    final res = await _api.login(email, password);
    if (res['success'] == true && res['data'] != null) {
      final data = res['data'];
      final accessToken = data['tokens']?['accessToken'] ?? data['accessToken'];
      if (accessToken != null) {
        await StorageService.saveToken(accessToken);
        _token = accessToken;
        _user = User.fromJson(data['user']);
        _isAuthenticated = true;
        notifyListeners();
      }
    }
  }

  Future<void> register(Map<String, dynamic> data) async {
    final res = await _api.register(data);
    if (res['success'] == true && res['data'] != null) {
      final resData = res['data'];
      final accessToken = resData['tokens']?['accessToken'] ?? resData['accessToken'];
      if (accessToken != null) {
        await StorageService.saveToken(accessToken);
        _token = accessToken;
        _user = User.fromJson(resData['user']);
        _isAuthenticated = true;
        notifyListeners();
      }
    }
  }

  Future<void> logout() async {
    await StorageService.clearAll();
    _user = null;
    _token = null;
    _isAuthenticated = false;
    notifyListeners();
  }

  Future<void> refreshUser() async {
    if (_token == null) return;
    try {
      final res = await _api.getMe(_token!);
      if (res['success'] == true && res['data'] != null) {
        _user = User.fromJson(res['data']);
        notifyListeners();
      }
    } catch (_) {}
  }
}
