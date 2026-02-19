import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/theme.dart';
import '../../providers/auth_provider.dart';
import '../../services/api_service.dart';
import '../../widgets/shimmer_loading.dart';

class AdminUsersTab extends StatefulWidget {
  const AdminUsersTab({super.key});

  @override
  State<AdminUsersTab> createState() => _AdminUsersTabState();
}

class _AdminUsersTabState extends State<AdminUsersTab> {
  final ApiService _api = ApiService();
  final TextEditingController _searchController = TextEditingController();
  List<dynamic> _users = [];
  bool _loading = true;
  int _page = 1;
  int? _expandedUserId;
  List<dynamic>? _expandedHistory;

  @override
  void initState() {
    super.initState();
    _loadUsers();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadUsers({bool refresh = false}) async {
    final token = context.read<AuthProvider>().token;
    if (token == null) return;

    if (refresh) {
      _page = 1;
    }
    setState(() => _loading = true);

    try {
      final params = <String, String>{
        'page': _page.toString(),
        'limit': '20',
      };
      final search = _searchController.text.trim();
      if (search.isNotEmpty) params['search'] = search;

      final res = await _api.listUsers(params, token);
      final data = res['data'];
      final users = data is Map ? (data['data'] as List? ?? []) : (data as List? ?? []);

      setState(() {
        if (refresh || _page == 1) {
          _users = users;
        } else {
          _users.addAll(users);
        }
        _loading = false;
      });
    } catch (e) {
      setState(() => _loading = false);
    }
  }

  Future<void> _loadUserHistory(int userId) async {
    final token = context.read<AuthProvider>().token;
    if (token == null) return;

    try {
      final res = await _api.getUserHistory(userId, token);
      setState(() {
        _expandedHistory = res['data'] as List? ?? [];
      });
    } catch (_) {}
  }

  Future<void> _adjustCredits(int userId) async {
    final token = context.read<AuthProvider>().token;
    if (token == null) return;

    final amountController = TextEditingController();
    final reasonController = TextEditingController();

    final result = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Adjust Credits'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: amountController,
              keyboardType: const TextInputType.numberWithOptions(signed: true),
              decoration: const InputDecoration(labelText: 'Amount (+ or -)'),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: reasonController,
              decoration: const InputDecoration(labelText: 'Reason'),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          ElevatedButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Adjust')),
        ],
      ),
    );

    if (result != true) return;

    final amount = int.tryParse(amountController.text);
    if (amount == null || amount == 0) return;

    try {
      await _api.adjustUserCredits(userId, amount, reasonController.text.trim().isEmpty ? 'Admin adjustment' : reasonController.text.trim(), token);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Credits adjusted'), backgroundColor: AppTheme.primary),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString()), backgroundColor: AppTheme.error),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.all(16),
          child: TextField(
            controller: _searchController,
            onSubmitted: (_) => _loadUsers(refresh: true),
            decoration: InputDecoration(
              hintText: 'Search users...',
              prefixIcon: const Icon(Icons.search),
              suffixIcon: IconButton(
                icon: const Icon(Icons.search),
                onPressed: () => _loadUsers(refresh: true),
              ),
            ),
          ),
        ),
        Expanded(
          child: _loading && _users.isEmpty
              ? ListView(children: const [
                  Padding(padding: EdgeInsets.all(16), child: ShimmerCard(height: 70)),
                  Padding(padding: EdgeInsets.symmetric(horizontal: 16), child: ShimmerCard(height: 70)),
                ])
              : RefreshIndicator(
                  onRefresh: () => _loadUsers(refresh: true),
                  color: AppTheme.primary,
                  child: ListView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    itemCount: _users.length,
                    itemBuilder: (context, index) {
                      final user = _users[index];
                      final userId = user['userId'] ?? user['id'] ?? 0;
                      final isExpanded = _expandedUserId == userId;

                      return Card(
                        margin: const EdgeInsets.only(bottom: 8),
                        child: Column(
                          children: [
                            ListTile(
                              leading: CircleAvatar(
                                backgroundColor: AppTheme.primary.withValues(alpha: 0.2),
                                child: Text(
                                  (user['email'] ?? 'U')[0].toUpperCase(),
                                  style: TextStyle(color: AppTheme.primary, fontWeight: FontWeight.bold),
                                ),
                              ),
                              title: Text(user['name'] ?? user['email'] ?? '', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500)),
                              subtitle: Text(user['email'] ?? '', style: TextStyle(fontSize: 12, color: AppTheme.textSecondary)),
                              trailing: Icon(isExpanded ? Icons.expand_less : Icons.expand_more),
                              onTap: () {
                                setState(() {
                                  if (isExpanded) {
                                    _expandedUserId = null;
                                    _expandedHistory = null;
                                  } else {
                                    _expandedUserId = userId;
                                    _expandedHistory = null;
                                    _loadUserHistory(userId);
                                  }
                                });
                              },
                            ),
                            if (isExpanded) ...[
                              const Divider(height: 1),
                              Padding(
                                padding: const EdgeInsets.all(12),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      children: [
                                        ElevatedButton.icon(
                                          onPressed: () => _adjustCredits(userId),
                                          icon: const Icon(Icons.monetization_on, size: 16),
                                          label: const Text('Adjust Credits', style: TextStyle(fontSize: 12)),
                                          style: ElevatedButton.styleFrom(padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8)),
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 12),
                                    Text('Credit History', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                                    const SizedBox(height: 8),
                                    if (_expandedHistory == null)
                                      const Center(child: SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2)))
                                    else if (_expandedHistory!.isEmpty)
                                      Text('No history', style: TextStyle(color: AppTheme.textSecondary, fontSize: 12))
                                    else
                                      ...(_expandedHistory!.take(10).map((entry) {
                                        final amount = entry['amount'] ?? 0;
                                        return Padding(
                                          padding: const EdgeInsets.symmetric(vertical: 3),
                                          child: Row(
                                            children: [
                                              Expanded(
                                                child: Text(
                                                  entry['sourceDetail'] ?? entry['type'] ?? '',
                                                  style: const TextStyle(fontSize: 12),
                                                  maxLines: 1,
                                                  overflow: TextOverflow.ellipsis,
                                                ),
                                              ),
                                              Text(
                                                '${amount > 0 ? "+" : ""}$amount',
                                                style: TextStyle(
                                                  color: amount > 0 ? AppTheme.primary : AppTheme.error,
                                                  fontWeight: FontWeight.w600,
                                                  fontSize: 12,
                                                ),
                                              ),
                                            ],
                                          ),
                                        );
                                      })),
                                  ],
                                ),
                              ),
                            ],
                          ],
                        ),
                      );
                    },
                  ),
                ),
        ),
      ],
    );
  }
}
