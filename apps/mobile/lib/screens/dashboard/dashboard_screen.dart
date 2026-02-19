import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/theme.dart';
import '../../providers/auth_provider.dart';
import '../../services/api_service.dart';
import '../../widgets/shimmer_loading.dart';
import '../catalogue/converter_detail_screen.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  final ApiService _api = ApiService();
  Map<String, dynamic>? _balance;
  List<dynamic> _ledger = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    final token = context.read<AuthProvider>().token;
    if (token == null) return;

    setState(() => _loading = true);
    try {
      final results = await Future.wait([
        _api.getCreditBalance(token),
        _api.getCreditLedger(token),
      ]);

      setState(() {
        _balance = results[0]['data'];
        final ledgerData = results[1]['data'];
        _ledger = ledgerData is List ? ledgerData : (ledgerData?['entries'] ?? []);
        _loading = false;
      });
    } catch (e) {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Dashboard'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadData,
          ),
        ],
      ),
      body: _loading
          ? _buildShimmer()
          : RefreshIndicator(
              onRefresh: _loadData,
              color: AppTheme.primary,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  // Credit Balance Card
                  Card(
                    color: AppTheme.primary.withValues(alpha: 0.1),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                      side: BorderSide(color: AppTheme.primary.withValues(alpha: 0.3)),
                    ),
                    child: Padding(
                      padding: const EdgeInsets.all(20),
                      child: Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: AppTheme.primary.withValues(alpha: 0.2),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Icon(Icons.monetization_on, color: AppTheme.primary, size: 32),
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text('Credit Balance', style: TextStyle(color: AppTheme.textSecondary, fontSize: 13)),
                                const SizedBox(height: 4),
                                Text(
                                  '${_balance?['available'] ?? 0}',
                                  style: TextStyle(
                                    color: AppTheme.primary,
                                    fontSize: 32,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Stats row
                  Row(
                    children: [
                      Expanded(
                        child: _StatCard(
                          icon: Icons.visibility,
                          label: 'Lifetime Earned',
                          value: '${_balance?['lifetimeEarned'] ?? 0}',
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: _StatCard(
                          icon: Icons.trending_down,
                          label: 'Lifetime Spent',
                          value: '${_balance?['lifetimeSpent'] ?? 0}',
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),

                  // Recent Searches
                  Text(
                    'Recent Searches',
                    style: TextStyle(fontWeight: FontWeight.w600, fontSize: 16),
                  ),
                  const SizedBox(height: 12),

                  if (_ledger.isEmpty)
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(24),
                        child: Center(
                          child: Column(
                            children: [
                              Icon(Icons.history, size: 40, color: AppTheme.textSecondary.withValues(alpha: 0.3)),
                              const SizedBox(height: 8),
                              Text('No recent searches', style: TextStyle(color: AppTheme.textSecondary)),
                            ],
                          ),
                        ),
                      ),
                    )
                  else
                    ...(_ledger.where((e) => e['type'] == 'CONSUMPTION').take(15).map((entry) {
                      final sourceDetail = entry['sourceDetail'] ?? '';
                      final sourceId = entry['sourceId'];
                      final amount = entry['amount'] ?? 0;
                      final date = entry['createdAt'] ?? '';

                      return Card(
                        margin: const EdgeInsets.only(bottom: 8),
                        child: ListTile(
                          leading: Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: AppTheme.primary.withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Icon(Icons.search, color: AppTheme.primary, size: 20),
                          ),
                          title: Text(
                            sourceDetail.isNotEmpty ? sourceDetail : 'Converter View',
                            style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          subtitle: Text(
                            _formatDate(date),
                            style: TextStyle(fontSize: 11, color: AppTheme.textSecondary),
                          ),
                          trailing: Text(
                            '${amount > 0 ? "+" : ""}$amount',
                            style: TextStyle(
                              color: amount > 0 ? AppTheme.primary : AppTheme.error,
                              fontWeight: FontWeight.w600,
                              fontSize: 13,
                            ),
                          ),
                          onTap: sourceId != null
                              ? () {
                                  Navigator.of(context).push(
                                    MaterialPageRoute(
                                      builder: (_) => ConverterDetailScreen(converterId: sourceId),
                                    ),
                                  );
                                }
                              : null,
                        ),
                      );
                    })),

                  const SizedBox(height: 24),
                  const Divider(),
                  const SizedBox(height: 12),

                  // Profile section
                  Text('Account', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 16)),
                  const SizedBox(height: 12),
                  Card(
                    child: Column(
                      children: [
                        ListTile(
                          leading: CircleAvatar(
                            backgroundColor: AppTheme.primary.withValues(alpha: 0.2),
                            child: Text(
                              (auth.user?.email ?? 'U')[0].toUpperCase(),
                              style: TextStyle(color: AppTheme.primary, fontWeight: FontWeight.bold),
                            ),
                          ),
                          title: Text(auth.user?.name ?? auth.user?.email ?? ''),
                          subtitle: Text(auth.user?.email ?? '', style: TextStyle(color: AppTheme.textSecondary, fontSize: 12)),
                        ),
                        const Divider(height: 1),
                        ListTile(
                          leading: Icon(Icons.logout, color: AppTheme.error),
                          title: Text('Sign Out', style: TextStyle(color: AppTheme.error)),
                          onTap: () async {
                            await auth.logout();
                          },
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 40),
                ],
              ),
            ),
    );
  }

  String _formatDate(String iso) {
    try {
      final d = DateTime.parse(iso);
      return '${d.day}/${d.month}/${d.year} ${d.hour.toString().padLeft(2, '0')}:${d.minute.toString().padLeft(2, '0')}';
    } catch (_) {
      return iso;
    }
  }

  Widget _buildShimmer() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: const [
        ShimmerCard(height: 100),
        SizedBox(height: 16),
        Row(children: [Expanded(child: ShimmerCard(height: 80)), SizedBox(width: 12), Expanded(child: ShimmerCard(height: 80))]),
        SizedBox(height: 24),
        ShimmerLoading(height: 20, width: 150),
        SizedBox(height: 12),
        ShimmerCard(height: 60),
        SizedBox(height: 8),
        ShimmerCard(height: 60),
        SizedBox(height: 8),
        ShimmerCard(height: 60),
      ],
    );
  }
}

class _StatCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;

  const _StatCard({required this.icon, required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, color: AppTheme.textSecondary, size: 20),
            const SizedBox(height: 8),
            Text(value, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
            const SizedBox(height: 2),
            Text(label, style: TextStyle(color: AppTheme.textSecondary, fontSize: 11)),
          ],
        ),
      ),
    );
  }
}
