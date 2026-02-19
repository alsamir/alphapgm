import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/theme.dart';
import '../../providers/auth_provider.dart';
import '../../services/api_service.dart';
import '../../widgets/shimmer_loading.dart';

class AdminOverviewTab extends StatefulWidget {
  const AdminOverviewTab({super.key});

  @override
  State<AdminOverviewTab> createState() => _AdminOverviewTabState();
}

class _AdminOverviewTabState extends State<AdminOverviewTab> {
  final ApiService _api = ApiService();
  Map<String, dynamic>? _dashboard;
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
      final res = await _api.getAdminDashboard(token);
      setState(() {
        _dashboard = res['data'];
        _loading = false;
      });
    } catch (e) {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return ListView(
        padding: const EdgeInsets.all(16),
        children: const [
          Row(children: [Expanded(child: ShimmerCard(height: 100)), SizedBox(width: 12), Expanded(child: ShimmerCard(height: 100))]),
          SizedBox(height: 12),
          Row(children: [Expanded(child: ShimmerCard(height: 100)), SizedBox(width: 12), Expanded(child: ShimmerCard(height: 100))]),
        ],
      );
    }

    final d = _dashboard ?? {};

    return RefreshIndicator(
      onRefresh: _loadData,
      color: AppTheme.primary,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Row(
            children: [
              Expanded(child: _StatCard(icon: Icons.people, label: 'Total Users', value: '${d['totalUsers'] ?? 0}', color: AppTheme.primary)),
              const SizedBox(width: 12),
              Expanded(child: _StatCard(icon: Icons.auto_awesome, label: 'Converters', value: '${d['totalConverters'] ?? 0}', color: Colors.blue)),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(child: _StatCard(icon: Icons.monetization_on, label: 'Credits Issued', value: '${d['totalCreditsIssued'] ?? 0}', color: Colors.amber)),
              const SizedBox(width: 12),
              Expanded(child: _StatCard(icon: Icons.trending_up, label: 'Credits Used', value: '${d['totalCreditsUsed'] ?? 0}', color: Colors.purple)),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(child: _StatCard(icon: Icons.person_add, label: 'New Today', value: '${d['newUsersToday'] ?? 0}', color: Colors.teal)),
              const SizedBox(width: 12),
              Expanded(child: _StatCard(icon: Icons.search, label: 'Searches Today', value: '${d['searchesToday'] ?? 0}', color: Colors.orange)),
            ],
          ),
        ],
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final Color color;

  const _StatCard({required this.icon, required this.label, required this.value, required this.color});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(icon, color: color, size: 22),
            ),
            const SizedBox(height: 12),
            Text(value, style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
            const SizedBox(height: 2),
            Text(label, style: TextStyle(color: AppTheme.textSecondary, fontSize: 12)),
          ],
        ),
      ),
    );
  }
}
