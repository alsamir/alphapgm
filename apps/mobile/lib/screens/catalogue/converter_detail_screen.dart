import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/theme.dart';
import '../../config/api_config.dart';
import '../../providers/auth_provider.dart';
import '../../services/api_service.dart';
import '../../widgets/shimmer_loading.dart';

class ConverterDetailScreen extends StatefulWidget {
  final int converterId;
  const ConverterDetailScreen({super.key, required this.converterId});

  @override
  State<ConverterDetailScreen> createState() => _ConverterDetailScreenState();
}

class _ConverterDetailScreenState extends State<ConverterDetailScreen> {
  final ApiService _api = ApiService();
  Map<String, dynamic>? _converter;
  bool _loading = true;
  bool _addingToList = false;
  List<dynamic> _relatedConverters = [];

  @override
  void initState() {
    super.initState();
    _loadConverter();
  }

  Future<void> _loadConverter() async {
    final token = context.read<AuthProvider>().token;
    if (token == null) return;

    try {
      final res = await _api.getConverter(widget.converterId, token);
      if (res['success'] == true && res['data'] != null) {
        setState(() {
          _converter = res['data'];
          _loading = false;
        });
        _loadRelated();
      }
    } catch (e) {
      setState(() => _loading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString()), backgroundColor: AppTheme.error),
        );
      }
    }
  }

  Future<void> _loadRelated() async {
    if (_converter == null) return;
    final brand = _converter!['brand'];
    if (brand == null) return;
    final token = context.read<AuthProvider>().token;
    try {
      final res = await _api.searchConverters({
        'brand': brand,
        'limit': '10',
        'page': '1',
      }, token: token);
      if (res['success'] == true) {
        final data = res['data'];
        final list = data is Map ? (data['data'] as List?) ?? [] : (data as List?) ?? [];
        setState(() {
          _relatedConverters = list.where((c) => c['id'] != widget.converterId).take(8).toList();
        });
      }
    } catch (_) {}
  }

  Future<void> _addToPriceList() async {
    final token = context.read<AuthProvider>().token;
    if (token == null) return;

    setState(() => _addingToList = true);

    try {
      // Get user's price lists
      final listsRes = await _api.getPriceLists(token);
      final lists = listsRes['data'] as List? ?? [];

      int priceListId;
      if (lists.isEmpty) {
        // Auto-create a price list
        final createRes = await _api.createPriceList('My Price List', token);
        priceListId = createRes['data']['id'];
      } else {
        priceListId = lists[0]['id'];
      }

      // Add converter to price list
      await _api.addPriceListItem(priceListId, widget.converterId, 1, token);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Added to price list!'),
            backgroundColor: AppTheme.primary,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString()), backgroundColor: AppTheme.error),
        );
      }
    } finally {
      if (mounted) setState(() => _addingToList = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(_converter?['name'] ?? 'Converter Detail'),
      ),
      body: _loading
          ? _buildShimmer()
          : _converter == null
              ? const Center(child: Text('Converter not found'))
              : _buildContent(),
      bottomNavigationBar: (!_loading && _converter != null)
          ? SafeArea(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  children: [
                    // Price display
                    if (_converter!['calculatedPrice'] != null)
                      Expanded(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Estimated Value', style: TextStyle(color: AppTheme.textSecondary, fontSize: 12)),
                            Text(
                              '\$${(_converter!['calculatedPrice'] as num).toStringAsFixed(2)}',
                              style: TextStyle(color: AppTheme.primary, fontSize: 22, fontWeight: FontWeight.bold),
                            ),
                          ],
                        ),
                      ),
                    const SizedBox(width: 12),
                    ElevatedButton.icon(
                      onPressed: _addingToList ? null : _addToPriceList,
                      icon: _addingToList
                          ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2))
                          : const Icon(Icons.add_shopping_cart),
                      label: const Text('Add to List'),
                      style: ElevatedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
                      ),
                    ),
                  ],
                ),
              ),
            )
          : null,
    );
  }

  Widget _buildContent() {
    final c = _converter!;
    return SingleChildScrollView(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Image
          Container(
            height: 280,
            width: double.infinity,
            color: AppTheme.surface,
            child: Image.network(
              '${ApiConfig.baseUrl}/api/v1/images/thumb/${widget.converterId}',
              fit: BoxFit.contain,
              errorBuilder: (_, __, ___) => Center(
                child: Icon(Icons.image_not_supported_outlined, size: 64, color: AppTheme.textSecondary.withValues(alpha: 0.3)),
              ),
            ),
          ),

          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Name
                Text(
                  c['name'] ?? 'Unknown',
                  style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 8),

                // Brand badge
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppTheme.surface,
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(color: AppTheme.border),
                  ),
                  child: Text(c['brand'] ?? '', style: TextStyle(color: AppTheme.textSecondary, fontSize: 13)),
                ),
                const SizedBox(height: 16),

                // Info cards
                _infoRow(Icons.qr_code, 'Serial Number', c['serialNumber'] ?? 'N/A'),
                _infoRow(Icons.scale, 'Weight', c['weight'] != null ? '${c['weight']}' : 'N/A'),
                const SizedBox(height: 16),

                // Metal presence
                Text('Metal Content', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 15)),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  children: [
                    _metalChip('Platinum (Pt)', c['hasPt'] == true),
                    _metalChip('Palladium (Pd)', c['hasPd'] == true),
                    _metalChip('Rhodium (Rh)', c['hasRh'] == true),
                  ],
                ),
                const SizedBox(height: 20),

                // Estimated value card
                if (c['calculatedPrice'] != null)
                  Card(
                    color: AppTheme.primary.withValues(alpha: 0.1),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                      side: BorderSide(color: AppTheme.primary.withValues(alpha: 0.3)),
                    ),
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Row(
                        children: [
                          Icon(Icons.attach_money, color: AppTheme.primary, size: 32),
                          const SizedBox(width: 12),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('Estimated Value', style: TextStyle(color: AppTheme.textSecondary, fontSize: 12)),
                              Text(
                                '\$${(c['calculatedPrice'] as num).toStringAsFixed(2)}',
                                style: TextStyle(color: AppTheme.primary, fontSize: 26, fontWeight: FontWeight.bold),
                              ),
                              Text('Based on current market prices', style: TextStyle(color: AppTheme.textSecondary, fontSize: 11)),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),

                // Related converters
                if (_relatedConverters.isNotEmpty) ...[
                  const SizedBox(height: 24),
                  Text('Related Converters', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 15)),
                  const SizedBox(height: 12),
                  SizedBox(
                    height: 160,
                    child: ListView.builder(
                      scrollDirection: Axis.horizontal,
                      itemCount: _relatedConverters.length,
                      itemBuilder: (context, index) {
                        final r = _relatedConverters[index];
                        return GestureDetector(
                          onTap: () {
                            Navigator.of(context).push(
                              MaterialPageRoute(builder: (_) => ConverterDetailScreen(converterId: r['id'])),
                            );
                          },
                          child: Container(
                            width: 130,
                            margin: const EdgeInsets.only(right: 10),
                            child: Card(
                              clipBehavior: Clip.antiAlias,
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Expanded(
                                    child: Container(
                                      width: double.infinity,
                                      color: AppTheme.surface,
                                      child: Image.network(
                                        '${ApiConfig.baseUrl}/api/v1/images/thumb/${r['id']}',
                                        fit: BoxFit.contain,
                                        errorBuilder: (_, __, ___) => Center(
                                          child: Icon(Icons.image_not_supported_outlined, size: 28, color: AppTheme.textSecondary.withValues(alpha: 0.3)),
                                        ),
                                      ),
                                    ),
                                  ),
                                  Padding(
                                    padding: const EdgeInsets.all(8),
                                    child: Text(
                                      r['name'] ?? '',
                                      style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w500),
                                      maxLines: 2,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _infoRow(IconData icon, String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: [
          Icon(icon, size: 18, color: AppTheme.textSecondary),
          const SizedBox(width: 10),
          Text(label, style: TextStyle(color: AppTheme.textSecondary, fontSize: 13)),
          const Spacer(),
          Text(value, style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 13)),
        ],
      ),
    );
  }

  Widget _metalChip(String label, bool present) {
    return Chip(
      label: Text(
        label,
        style: TextStyle(
          fontSize: 12,
          color: present ? AppTheme.primary : AppTheme.textSecondary.withValues(alpha: 0.5),
        ),
      ),
      avatar: Icon(
        present ? Icons.check_circle : Icons.cancel_outlined,
        size: 16,
        color: present ? AppTheme.primary : AppTheme.textSecondary.withValues(alpha: 0.5),
      ),
      backgroundColor: present ? AppTheme.primary.withValues(alpha: 0.1) : AppTheme.surface,
      side: BorderSide(
        color: present ? AppTheme.primary.withValues(alpha: 0.3) : AppTheme.border,
      ),
    );
  }

  Widget _buildShimmer() {
    return SingleChildScrollView(
      child: Column(
        children: [
          const ShimmerLoading(height: 280),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const ShimmerLoading(height: 28, width: 200),
                const SizedBox(height: 12),
                const ShimmerLoading(height: 20, width: 100),
                const SizedBox(height: 20),
                const ShimmerLoading(height: 16),
                const SizedBox(height: 8),
                const ShimmerLoading(height: 16),
                const SizedBox(height: 20),
                const ShimmerLoading(height: 80),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
