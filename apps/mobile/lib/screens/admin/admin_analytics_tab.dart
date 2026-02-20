import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:fl_chart/fl_chart.dart';
import '../../config/theme.dart';
import '../../providers/auth_provider.dart';
import '../../services/api_service.dart';
import '../../widgets/shimmer_loading.dart';

class AdminAnalyticsTab extends StatefulWidget {
  const AdminAnalyticsTab({super.key});

  @override
  State<AdminAnalyticsTab> createState() => _AdminAnalyticsTabState();
}

class _AdminAnalyticsTabState extends State<AdminAnalyticsTab> {
  final ApiService _api = ApiService();
  List<dynamic> _topConverters = [];
  List<dynamic> _searchVolume = [];
  List<dynamic> _activeUsers = [];
  List<dynamic> _countryData = [];
  List<dynamic> _aiUploads = [];
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
        _api.getAdminTopConverters(token),
        _api.getAdminSearchVolume(token),
        _api.getAdminActiveUsers(token),
        _api.getActivityByCountry(token),
        _api.getAiUploads(token),
      ]);

      setState(() {
        _topConverters = results[0]['data'] as List? ?? [];
        _searchVolume = results[1]['data'] as List? ?? [];
        _activeUsers = results[2]['data'] as List? ?? [];
        _countryData = results[3]['data'] as List? ?? [];
        _aiUploads = results[4]['data'] as List? ?? [];
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
        children: const [ShimmerCard(height: 200), SizedBox(height: 16), ShimmerCard(height: 200)],
      );
    }

    return RefreshIndicator(
      onRefresh: _loadData,
      color: AppTheme.primary,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Search Volume Chart
          _SectionTitle(title: 'Search Volume (30 days)'),
          const SizedBox(height: 8),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: SizedBox(
                height: 200,
                child: _searchVolume.isEmpty
                    ? Center(child: Text('No data', style: TextStyle(color: AppTheme.textSecondary)))
                    : LineChart(
                        LineChartData(
                          gridData: FlGridData(
                            show: true,
                            drawVerticalLine: false,
                            horizontalInterval: 1,
                            getDrawingHorizontalLine: (value) => FlLine(color: AppTheme.border.withValues(alpha: 0.3), strokeWidth: 0.5),
                          ),
                          titlesData: FlTitlesData(
                            leftTitles: AxisTitles(sideTitles: SideTitles(showTitles: true, reservedSize: 30, getTitlesWidget: (value, meta) => Text('${value.toInt()}', style: TextStyle(fontSize: 10, color: AppTheme.textSecondary)))),
                            bottomTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
                            topTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
                            rightTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
                          ),
                          borderData: FlBorderData(show: false),
                          lineBarsData: [
                            LineChartBarData(
                              spots: _searchVolume.asMap().entries.map((e) {
                                return FlSpot(e.key.toDouble(), (e.value['count'] ?? 0).toDouble());
                              }).toList(),
                              isCurved: true,
                              color: AppTheme.primary,
                              barWidth: 2,
                              dotData: FlDotData(show: false),
                              belowBarData: BarAreaData(
                                show: true,
                                color: AppTheme.primary.withValues(alpha: 0.1),
                              ),
                            ),
                          ],
                        ),
                      ),
              ),
            ),
          ),
          const SizedBox(height: 20),

          // Top Converters
          _SectionTitle(title: 'Top Searched Converters'),
          const SizedBox(height: 8),
          if (_topConverters.isEmpty)
            Card(child: Padding(padding: const EdgeInsets.all(24), child: Center(child: Text('No data', style: TextStyle(color: AppTheme.textSecondary)))))
          else
            ..._topConverters.take(10).map((c) {
              final maxCount = (_topConverters.first['viewCount'] ?? 1) as num;
              final count = (c['viewCount'] ?? 0) as num;
              final ratio = maxCount > 0 ? count / maxCount : 0.0;

              return Card(
                margin: const EdgeInsets.only(bottom: 6),
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              '${c['name'] ?? 'Unknown'} - ${c['brand'] ?? ''}',
                              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          Text('$count views', style: TextStyle(color: AppTheme.primary, fontWeight: FontWeight.w600, fontSize: 12)),
                        ],
                      ),
                      const SizedBox(height: 6),
                      ClipRRect(
                        borderRadius: BorderRadius.circular(4),
                        child: LinearProgressIndicator(
                          value: ratio.toDouble(),
                          backgroundColor: AppTheme.surface,
                          valueColor: AlwaysStoppedAnimation(AppTheme.primary),
                          minHeight: 4,
                        ),
                      ),
                    ],
                  ),
                ),
              );
            }),
          const SizedBox(height: 20),

          // Active Users
          _SectionTitle(title: 'Most Active Users'),
          const SizedBox(height: 8),
          if (_activeUsers.isEmpty)
            Card(child: Padding(padding: const EdgeInsets.all(24), child: Center(child: Text('No data', style: TextStyle(color: AppTheme.textSecondary)))))
          else
            ..._activeUsers.take(10).map((u) => Card(
                  margin: const EdgeInsets.only(bottom: 6),
                  child: ListTile(
                    dense: true,
                    leading: CircleAvatar(
                      radius: 16,
                      backgroundColor: AppTheme.primary.withValues(alpha: 0.2),
                      child: Text((u['email'] ?? 'U')[0].toUpperCase(), style: TextStyle(color: AppTheme.primary, fontSize: 12, fontWeight: FontWeight.bold)),
                    ),
                    title: Text(u['email'] ?? '', style: const TextStyle(fontSize: 13)),
                    trailing: Text('${u['creditsUsed'] ?? 0} credits', style: TextStyle(color: AppTheme.primary, fontSize: 12, fontWeight: FontWeight.w600)),
                  ),
                )),
          const SizedBox(height: 20),

          // Activity by Country
          _SectionTitle(title: 'Activity by Country'),
          const SizedBox(height: 8),
          if (_countryData.isEmpty)
            Card(child: Padding(padding: const EdgeInsets.all(24), child: Center(child: Text('No data', style: TextStyle(color: AppTheme.textSecondary)))))
          else
            ..._countryData.take(15).map((c) => Card(
                  margin: const EdgeInsets.only(bottom: 6),
                  child: ListTile(
                    dense: true,
                    leading: CircleAvatar(
                      radius: 16,
                      backgroundColor: AppTheme.primary.withValues(alpha: 0.2),
                      child: Icon(Icons.public, color: AppTheme.primary, size: 16),
                    ),
                    title: Text(c['country'] ?? 'Unknown', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500)),
                    trailing: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                          decoration: BoxDecoration(
                            color: AppTheme.primary.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Text('${c['actionCount'] ?? 0} actions', style: TextStyle(color: AppTheme.primary, fontSize: 11, fontWeight: FontWeight.w600)),
                        ),
                        const SizedBox(width: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                          decoration: BoxDecoration(
                            color: AppTheme.textSecondary.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Text('${c['uniqueUsers'] ?? 0} users', style: TextStyle(color: AppTheme.textSecondary, fontSize: 11, fontWeight: FontWeight.w600)),
                        ),
                      ],
                    ),
                  ),
                )),
          const SizedBox(height: 20),

          // AI Image Uploads
          _SectionTitle(title: 'AI Image Uploads'),
          const SizedBox(height: 8),
          if (_aiUploads.isEmpty)
            Card(child: Padding(padding: const EdgeInsets.all(24), child: Center(child: Text('No data', style: TextStyle(color: AppTheme.textSecondary)))))
          else
            ..._aiUploads.take(15).map((u) {
              final email = u['userEmail'] ?? u['email'] ?? 'Unknown';
              final date = u['createdAt'] ?? u['date'] ?? '';
              final identification = u['identification'] ?? u['identificationPreview'] ?? '';
              final matchCount = u['matchCount'] ?? 0;

              String formattedDate = date;
              try {
                final d = DateTime.parse(date);
                formattedDate = '${d.day}/${d.month}/${d.year} ${d.hour.toString().padLeft(2, '0')}:${d.minute.toString().padLeft(2, '0')}';
              } catch (_) {}

              return Card(
                margin: const EdgeInsets.only(bottom: 6),
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Icon(Icons.camera_alt, color: AppTheme.primary, size: 16),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(email, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500), maxLines: 1, overflow: TextOverflow.ellipsis),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                            decoration: BoxDecoration(
                              color: AppTheme.primary.withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Text('$matchCount matches', style: TextStyle(color: AppTheme.primary, fontSize: 11, fontWeight: FontWeight.w600)),
                          ),
                        ],
                      ),
                      if (identification.toString().isNotEmpty) ...[
                        const SizedBox(height: 6),
                        Text(
                          identification.toString(),
                          style: TextStyle(fontSize: 12, color: AppTheme.textSecondary),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                      const SizedBox(height: 4),
                      Text(formattedDate, style: TextStyle(fontSize: 11, color: AppTheme.textSecondary.withValues(alpha: 0.7))),
                    ],
                  ),
                ),
              );
            }),
          const SizedBox(height: 40),
        ],
      ),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  final String title;
  const _SectionTitle({required this.title});

  @override
  Widget build(BuildContext context) {
    return Text(title, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 16));
  }
}
