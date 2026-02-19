import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../config/theme.dart';
import '../providers/auth_provider.dart';
import 'catalogue/catalogue_screen.dart';
import 'dashboard/dashboard_screen.dart';
import 'dashboard/price_list_screen.dart';
import 'admin/admin_screen.dart';
import 'ai/chat_screen.dart';

class MainShell extends StatefulWidget {
  const MainShell({super.key});

  @override
  State<MainShell> createState() => _MainShellState();
}

class _MainShellState extends State<MainShell> {
  int _currentIndex = 0;

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final isAdmin = auth.isAdmin;

    final screens = [
      const CatalogueScreen(),
      if (auth.isAuthenticated) const PriceListScreen(),
      if (auth.isAuthenticated) const DashboardScreen(),
      if (isAdmin) const AdminScreen(),
    ];

    final navItems = [
      const BottomNavigationBarItem(
        icon: Icon(Icons.search),
        label: 'Catalogue',
      ),
      if (auth.isAuthenticated)
        const BottomNavigationBarItem(
          icon: Icon(Icons.description_outlined),
          label: 'Price List',
        ),
      if (auth.isAuthenticated)
        const BottomNavigationBarItem(
          icon: Icon(Icons.dashboard_outlined),
          label: 'Dashboard',
        ),
      if (isAdmin)
        const BottomNavigationBarItem(
          icon: Icon(Icons.admin_panel_settings_outlined),
          label: 'Admin',
        ),
    ];

    // Clamp index to valid range
    final maxIndex = screens.length - 1;
    if (_currentIndex > maxIndex) _currentIndex = 0;

    return Scaffold(
      body: IndexedStack(
        index: _currentIndex,
        children: screens,
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        onTap: (i) => setState(() => _currentIndex = i),
        items: navItems,
      ),
      floatingActionButton: auth.isAuthenticated
          ? FloatingActionButton(
              onPressed: () {
                Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => const ChatScreen()),
                );
              },
              backgroundColor: AppTheme.primary,
              child: const Icon(Icons.chat_bubble_outline, color: AppTheme.background),
            )
          : null,
    );
  }
}
