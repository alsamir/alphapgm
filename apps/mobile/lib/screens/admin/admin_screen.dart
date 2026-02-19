import 'package:flutter/material.dart';
import '../../config/theme.dart';
import 'admin_overview_tab.dart';
import 'admin_users_tab.dart';
import 'admin_analytics_tab.dart';
import 'admin_settings_tab.dart';

class AdminScreen extends StatelessWidget {
  const AdminScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 4,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Admin Panel'),
          bottom: TabBar(
            isScrollable: true,
            indicatorColor: AppTheme.primary,
            labelColor: AppTheme.primary,
            unselectedLabelColor: AppTheme.textSecondary,
            tabs: const [
              Tab(icon: Icon(Icons.dashboard_outlined, size: 20), text: 'Overview'),
              Tab(icon: Icon(Icons.people_outlined, size: 20), text: 'Users'),
              Tab(icon: Icon(Icons.bar_chart, size: 20), text: 'Analytics'),
              Tab(icon: Icon(Icons.settings_outlined, size: 20), text: 'Settings'),
            ],
          ),
        ),
        body: const TabBarView(
          children: [
            AdminOverviewTab(),
            AdminUsersTab(),
            AdminAnalyticsTab(),
            AdminSettingsTab(),
          ],
        ),
      ),
    );
  }
}
