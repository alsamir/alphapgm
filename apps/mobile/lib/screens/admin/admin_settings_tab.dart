import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/theme.dart';
import '../../providers/auth_provider.dart';
import '../../services/api_service.dart';

class AdminSettingsTab extends StatefulWidget {
  const AdminSettingsTab({super.key});

  @override
  State<AdminSettingsTab> createState() => _AdminSettingsTabState();
}

class _AdminSettingsTabState extends State<AdminSettingsTab> {
  final ApiService _api = ApiService();
  Map<String, TextEditingController> _controllers = {};
  bool _loading = true;
  bool _saving = false;

  static const _fields = [
    ('General', [
      ('site_name', 'Site Name', Icons.web),
      ('site_description', 'Site Description', Icons.description),
    ]),
    ('Contact', [
      ('contact_email', 'Contact Email', Icons.email),
      ('contact_phone', 'Contact Phone', Icons.phone),
      ('contact_address', 'Address', Icons.location_on),
    ]),
    ('Social', [
      ('social_facebook', 'Facebook', Icons.facebook),
      ('social_twitter', 'Twitter / X', Icons.alternate_email),
      ('social_linkedin', 'LinkedIn', Icons.business),
      ('social_whatsapp', 'WhatsApp', Icons.chat),
    ]),
    ('Analytics', [
      ('google_analytics_id', 'Google Analytics ID', Icons.bar_chart),
      ('google_tag_manager_id', 'GTM Container ID', Icons.code),
    ]),
  ];

  @override
  void initState() {
    super.initState();
    _loadSettings();
  }

  @override
  void dispose() {
    for (final c in _controllers.values) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _loadSettings() async {
    try {
      final res = await _api.getSiteSettings();
      final data = res['data'] as Map<String, dynamic>? ?? {};
      setState(() {
        _controllers = {};
        for (final group in _fields) {
          for (final field in group.$2) {
            _controllers[field.$1] = TextEditingController(text: data[field.$1]?.toString() ?? '');
          }
        }
        _loading = false;
      });
    } catch (e) {
      setState(() => _loading = false);
    }
  }

  Future<void> _saveSettings() async {
    final token = context.read<AuthProvider>().token;
    if (token == null) return;

    setState(() => _saving = true);
    try {
      final payload = <String, dynamic>{};
      for (final entry in _controllers.entries) {
        payload[entry.key] = entry.value.text;
      }
      await _api.updateSiteSettings(payload, token);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Settings saved'), backgroundColor: AppTheme.primary),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString()), backgroundColor: AppTheme.error),
        );
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Center(child: CircularProgressIndicator(color: AppTheme.primary));
    }

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        ..._fields.map((group) {
          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(group.$1, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 16)),
              const SizedBox(height: 8),
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    children: group.$2.map((field) {
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 12),
                        child: TextField(
                          controller: _controllers[field.$1],
                          decoration: InputDecoration(
                            labelText: field.$2,
                            prefixIcon: Icon(field.$3, size: 20),
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                ),
              ),
              const SizedBox(height: 16),
            ],
          );
        }),
        ElevatedButton.icon(
          onPressed: _saving ? null : _saveSettings,
          icon: _saving
              ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2))
              : const Icon(Icons.save),
          label: Text(_saving ? 'Saving...' : 'Save Settings'),
        ),
        const SizedBox(height: 40),
      ],
    );
  }
}
