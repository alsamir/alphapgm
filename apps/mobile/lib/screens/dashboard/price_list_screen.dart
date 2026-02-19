import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'dart:io';
import 'package:path_provider/path_provider.dart';
import 'package:open_file/open_file.dart';
import '../../config/theme.dart';
import '../../providers/auth_provider.dart';
import '../../services/api_service.dart';
import '../../models/price_list.dart';
import '../../widgets/shimmer_loading.dart';

class PriceListScreen extends StatefulWidget {
  const PriceListScreen({super.key});

  @override
  State<PriceListScreen> createState() => _PriceListScreenState();
}

class _PriceListScreenState extends State<PriceListScreen> {
  final ApiService _api = ApiService();
  List<PriceListSummary> _lists = [];
  PriceListDetail? _selectedList;
  bool _loading = true;
  bool _detailLoading = false;
  String _message = '';

  @override
  void initState() {
    super.initState();
    _loadLists();
  }

  Future<void> _loadLists() async {
    final token = context.read<AuthProvider>().token;
    if (token == null) return;

    setState(() => _loading = true);
    try {
      final res = await _api.getPriceLists(token);
      final data = res['data'] as List? ?? [];
      setState(() {
        _lists = data.map((l) => PriceListSummary.fromJson(l)).toList();
        _loading = false;
      });
    } catch (e) {
      setState(() => _loading = false);
    }
  }

  Future<void> _selectList(int id) async {
    final token = context.read<AuthProvider>().token;
    if (token == null) return;

    setState(() => _detailLoading = true);
    try {
      final res = await _api.getPriceList(id, token);
      setState(() {
        _selectedList = PriceListDetail.fromJson(res['data']);
        _detailLoading = false;
      });
    } catch (e) {
      setState(() => _detailLoading = false);
      _showMessage(e.toString());
    }
  }

  Future<void> _createList() async {
    final token = context.read<AuthProvider>().token;
    if (token == null) return;

    try {
      await _api.createPriceList('My Price List', token);
      _showMessage('Price list created!');
      _loadLists();
    } catch (e) {
      _showMessage(e.toString());
    }
  }

  Future<void> _deleteList(int id) async {
    final token = context.read<AuthProvider>().token;
    if (token == null) return;

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete Price List?'),
        content: const Text('This will permanently remove this list and all its items.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: Text('Delete', style: TextStyle(color: AppTheme.error)),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    try {
      await _api.deletePriceList(id, token);
      if (_selectedList?.id == id) setState(() => _selectedList = null);
      _showMessage('Price list deleted');
      _loadLists();
    } catch (e) {
      _showMessage(e.toString());
    }
  }

  Future<void> _updateQuantity(int itemId, int quantity) async {
    if (quantity < 1 || _selectedList == null) return;
    final token = context.read<AuthProvider>().token;
    if (token == null) return;

    try {
      await _api.updatePriceListItemQuantity(_selectedList!.id, itemId, quantity, token);
      _selectList(_selectedList!.id);
      _loadLists();
    } catch (e) {
      _showMessage(e.toString());
    }
  }

  Future<void> _removeItem(int itemId) async {
    if (_selectedList == null) return;
    final token = context.read<AuthProvider>().token;
    if (token == null) return;

    try {
      await _api.removePriceListItem(_selectedList!.id, itemId, token);
      _showMessage('Item removed');
      _selectList(_selectedList!.id);
      _loadLists();
    } catch (e) {
      _showMessage(e.toString());
    }
  }

  Future<void> _exportPdf() async {
    if (_selectedList == null) return;
    final token = context.read<AuthProvider>().token;
    if (token == null) return;

    try {
      final bytes = await _api.exportPriceList(_selectedList!.id, token);
      final dir = await getTemporaryDirectory();
      final file = File('${dir.path}/pricelist-${_selectedList!.id}.pdf');
      await file.writeAsBytes(bytes);
      await OpenFile.open(file.path);
    } catch (e) {
      _showMessage('Export failed: $e');
    }
  }

  void _showMessage(String msg) {
    setState(() => _message = msg);
    Future.delayed(const Duration(seconds: 3), () {
      if (mounted) setState(() => _message = '');
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(_selectedList != null ? _selectedList!.name : 'Price Lists'),
        leading: _selectedList != null
            ? IconButton(
                icon: const Icon(Icons.arrow_back),
                onPressed: () => setState(() => _selectedList = null),
              )
            : null,
        actions: [
          if (_selectedList != null)
            IconButton(
              icon: const Icon(Icons.picture_as_pdf),
              onPressed: _exportPdf,
              tooltip: 'Export PDF',
            ),
        ],
      ),
      body: Column(
        children: [
          if (_message.isNotEmpty)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              color: AppTheme.primary.withValues(alpha: 0.1),
              child: Row(
                children: [
                  Expanded(child: Text(_message, style: const TextStyle(fontSize: 13))),
                  GestureDetector(
                    onTap: () => setState(() => _message = ''),
                    child: const Icon(Icons.close, size: 16),
                  ),
                ],
              ),
            ),
          Expanded(
            child: _selectedList != null ? _buildDetail() : _buildListView(),
          ),
        ],
      ),
    );
  }

  Widget _buildListView() {
    if (_loading) {
      return ListView(
        padding: const EdgeInsets.all(16),
        children: const [ShimmerCard(height: 80), SizedBox(height: 8), ShimmerCard(height: 80)],
      );
    }

    if (_lists.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.description_outlined, size: 64, color: AppTheme.textSecondary.withValues(alpha: 0.3)),
            const SizedBox(height: 12),
            Text('No price lists yet', style: TextStyle(color: AppTheme.textSecondary)),
            const SizedBox(height: 16),
            ElevatedButton.icon(
              onPressed: _createList,
              icon: const Icon(Icons.add),
              label: const Text('Create Price List'),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadLists,
      color: AppTheme.primary,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _lists.length,
        itemBuilder: (context, index) {
          final list = _lists[index];
          return Card(
            margin: const EdgeInsets.only(bottom: 10),
            child: ListTile(
              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              leading: Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: AppTheme.primary.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(Icons.description, color: AppTheme.primary),
              ),
              title: Text(list.name, style: const TextStyle(fontWeight: FontWeight.w600)),
              subtitle: Text(
                '${list.itemCount} items  •  \$${list.total.toStringAsFixed(2)}',
                style: TextStyle(color: AppTheme.textSecondary, fontSize: 12),
              ),
              trailing: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  IconButton(
                    icon: Icon(Icons.delete_outline, color: AppTheme.error, size: 20),
                    onPressed: () => _deleteList(list.id),
                  ),
                  const Icon(Icons.chevron_right, size: 20),
                ],
              ),
              onTap: () => _selectList(list.id),
            ),
          );
        },
      ),
    );
  }

  Widget _buildDetail() {
    if (_detailLoading) {
      return ListView(
        padding: const EdgeInsets.all(16),
        children: const [ShimmerCard(height: 60), SizedBox(height: 8), ShimmerCard(height: 60), SizedBox(height: 8), ShimmerCard(height: 60)],
      );
    }

    final list = _selectedList!;

    if (list.items.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.inventory_2_outlined, size: 64, color: AppTheme.textSecondary.withValues(alpha: 0.3)),
            const SizedBox(height: 12),
            Text('No items in this list', style: TextStyle(color: AppTheme.textSecondary)),
            const SizedBox(height: 4),
            Text('Add converters from the catalogue', style: TextStyle(color: AppTheme.textSecondary, fontSize: 12)),
          ],
        ),
      );
    }

    return Column(
      children: [
        Expanded(
          child: ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: list.items.length,
            itemBuilder: (context, index) {
              final item = list.items[index];
              return Card(
                margin: const EdgeInsets.only(bottom: 10),
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(item.converterName, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                                const SizedBox(height: 2),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                                  decoration: BoxDecoration(
                                    color: AppTheme.surface,
                                    borderRadius: BorderRadius.circular(4),
                                  ),
                                  child: Text(item.converterBrand, style: TextStyle(fontSize: 10, color: AppTheme.textSecondary)),
                                ),
                              ],
                            ),
                          ),
                          IconButton(
                            icon: Icon(Icons.delete_outline, color: AppTheme.error, size: 20),
                            onPressed: () => _removeItem(item.id),
                            constraints: const BoxConstraints(minWidth: 36, minHeight: 36),
                            padding: EdgeInsets.zero,
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),
                      Row(
                        children: [
                          // Quantity controls
                          Container(
                            decoration: BoxDecoration(
                              border: Border.all(color: AppTheme.border),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                InkWell(
                                  onTap: item.quantity > 1 ? () => _updateQuantity(item.id, item.quantity - 1) : null,
                                  child: Padding(
                                    padding: const EdgeInsets.all(6),
                                    child: Icon(Icons.remove, size: 16, color: item.quantity > 1 ? AppTheme.textPrimary : AppTheme.textSecondary),
                                  ),
                                ),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 12),
                                  child: Text('${item.quantity}', style: const TextStyle(fontWeight: FontWeight.w600)),
                                ),
                                InkWell(
                                  onTap: () => _updateQuantity(item.id, item.quantity + 1),
                                  child: const Padding(
                                    padding: EdgeInsets.all(6),
                                    child: Icon(Icons.add, size: 16),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const Spacer(),
                          // Prices
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              if (item.unitPrice != null)
                                Text(
                                  '\$${item.unitPrice!.toStringAsFixed(2)} / unit',
                                  style: TextStyle(color: AppTheme.textSecondary, fontSize: 11),
                                ),
                              Text(
                                item.totalPrice != null ? '\$${item.totalPrice!.toStringAsFixed(2)}' : '--',
                                style: TextStyle(color: AppTheme.primary, fontWeight: FontWeight.bold, fontSize: 16),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
        // Total bar
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppTheme.surface,
            border: Border(top: BorderSide(color: AppTheme.border)),
          ),
          child: SafeArea(
            top: false,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('Total', style: TextStyle(color: AppTheme.textSecondary, fontSize: 15)),
                Text(
                  '\$${list.total.toStringAsFixed(2)}',
                  style: TextStyle(color: AppTheme.primary, fontSize: 24, fontWeight: FontWeight.bold),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
