import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/theme.dart';
import '../../config/api_config.dart';
import '../../models/converter.dart';
import '../../providers/auth_provider.dart';
import '../../services/api_service.dart';
import '../../widgets/shimmer_loading.dart';
import 'converter_detail_screen.dart';
import '../auth/login_screen.dart';

class CatalogueScreen extends StatefulWidget {
  const CatalogueScreen({super.key});

  @override
  State<CatalogueScreen> createState() => _CatalogueScreenState();
}

class _CatalogueScreenState extends State<CatalogueScreen> {
  final ApiService _api = ApiService();
  final TextEditingController _searchController = TextEditingController();
  final ScrollController _scrollController = ScrollController();

  List<Converter> _converters = [];
  List<Brand> _brands = [];
  String? _selectedBrand;
  bool _loading = true;
  bool _loadingMore = false;
  bool _hasMore = true;
  int _page = 1;
  String _search = '';

  @override
  void initState() {
    super.initState();
    _loadBrands();
    _loadConverters();
    _scrollController.addListener(_onScroll);
  }

  @override
  void dispose() {
    _searchController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (_scrollController.position.pixels >= _scrollController.position.maxScrollExtent - 200) {
      if (!_loadingMore && _hasMore) {
        _loadMore();
      }
    }
  }

  Future<void> _loadBrands() async {
    try {
      final token = context.read<AuthProvider>().token;
      final res = await _api.getBrands(token: token);
      if (res['success'] == true && res['data'] != null) {
        setState(() {
          _brands = (res['data'] as List).map((b) => Brand.fromJson(b)).toList();
        });
      }
    } catch (_) {}
  }

  Future<void> _loadConverters({bool refresh = false}) async {
    if (refresh) {
      setState(() {
        _page = 1;
        _hasMore = true;
        _loading = true;
      });
    }

    try {
      final token = context.read<AuthProvider>().token;
      final params = <String, String>{
        'page': _page.toString(),
        'limit': '20',
      };
      if (_search.isNotEmpty) params['search'] = _search;
      if (_selectedBrand != null) params['brand'] = _selectedBrand!;

      final res = await _api.searchConverters(params, token: token);
      if (res['success'] == true) {
        final data = res['data'];
        final list = data is Map ? (data['data'] as List?) ?? [] : (data as List?) ?? [];
        final converters = list.map((c) => Converter.fromJson(c)).toList();
        final hasMore = data is Map ? (data['hasMore'] ?? false) : converters.length >= 20;

        setState(() {
          if (refresh || _page == 1) {
            _converters = converters;
          } else {
            _converters.addAll(converters);
          }
          _hasMore = hasMore;
          _loading = false;
        });
      }
    } catch (e) {
      setState(() => _loading = false);
    }
  }

  Future<void> _loadMore() async {
    if (_loadingMore) return;
    setState(() => _loadingMore = true);
    _page++;
    await _loadConverters();
    setState(() => _loadingMore = false);
  }

  void _onSearchChanged(String value) {
    _search = value;
    _page = 1;
    _loadConverters(refresh: true);
  }

  void _onBrandSelected(String? brand) {
    setState(() => _selectedBrand = brand);
    _page = 1;
    _loadConverters(refresh: true);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            Icon(Icons.auto_awesome, color: AppTheme.primary, size: 24),
            const SizedBox(width: 8),
            const Text('Catalyser'),
          ],
        ),
        actions: [
          Consumer<AuthProvider>(
            builder: (context, auth, _) {
              if (auth.isAuthenticated) {
                return Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: CircleAvatar(
                    radius: 16,
                    backgroundColor: AppTheme.primary.withValues(alpha: 0.2),
                    child: Text(
                      (auth.user?.email ?? 'U')[0].toUpperCase(),
                      style: TextStyle(color: AppTheme.primary, fontSize: 14, fontWeight: FontWeight.bold),
                    ),
                  ),
                );
              }
              return IconButton(
                icon: const Icon(Icons.login),
                onPressed: () {
                  Navigator.of(context).push(MaterialPageRoute(builder: (_) => const LoginScreen()));
                },
              );
            },
          ),
        ],
      ),
      body: Column(
        children: [
          // Search bar
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
            child: TextField(
              controller: _searchController,
              onChanged: _onSearchChanged,
              decoration: InputDecoration(
                hintText: 'Search converters...',
                prefixIcon: const Icon(Icons.search, color: AppTheme.textSecondary),
                suffixIcon: _search.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear, size: 20),
                        onPressed: () {
                          _searchController.clear();
                          _onSearchChanged('');
                        },
                      )
                    : null,
              ),
            ),
          ),

          // Brand chips
          if (_brands.isNotEmpty)
            SizedBox(
              height: 42,
              child: ListView.builder(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 12),
                itemCount: _brands.length + 1,
                itemBuilder: (context, index) {
                  if (index == 0) {
                    return Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 4),
                      child: FilterChip(
                        label: const Text('All'),
                        selected: _selectedBrand == null,
                        onSelected: (_) => _onBrandSelected(null),
                        selectedColor: AppTheme.primary.withValues(alpha: 0.2),
                        checkmarkColor: AppTheme.primary,
                      ),
                    );
                  }
                  final brand = _brands[index - 1];
                  return Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 4),
                    child: FilterChip(
                      label: Text('${brand.name} (${brand.count})'),
                      selected: _selectedBrand == brand.name,
                      onSelected: (_) => _onBrandSelected(
                        _selectedBrand == brand.name ? null : brand.name,
                      ),
                      selectedColor: AppTheme.primary.withValues(alpha: 0.2),
                      checkmarkColor: AppTheme.primary,
                    ),
                  );
                },
              ),
            ),

          const SizedBox(height: 8),

          // Converter grid
          Expanded(
            child: _loading
                ? _buildShimmerGrid()
                : _converters.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.search_off, size: 64, color: AppTheme.textSecondary.withValues(alpha: 0.3)),
                            const SizedBox(height: 12),
                            Text('No converters found', style: TextStyle(color: AppTheme.textSecondary)),
                          ],
                        ),
                      )
                    : RefreshIndicator(
                        onRefresh: () => _loadConverters(refresh: true),
                        color: AppTheme.primary,
                        child: GridView.builder(
                          controller: _scrollController,
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                            crossAxisCount: 2,
                            mainAxisSpacing: 10,
                            crossAxisSpacing: 10,
                            childAspectRatio: 0.72,
                          ),
                          itemCount: _converters.length + (_loadingMore ? 2 : 0),
                          itemBuilder: (context, index) {
                            if (index >= _converters.length) {
                              return const ShimmerCard(height: 180);
                            }
                            return _ConverterCard(
                              converter: _converters[index],
                              onTap: () => _openDetail(_converters[index]),
                            );
                          },
                        ),
                      ),
          ),
        ],
      ),
    );
  }

  void _openDetail(Converter converter) {
    final auth = context.read<AuthProvider>();
    if (!auth.isAuthenticated) {
      Navigator.of(context).push(MaterialPageRoute(builder: (_) => const LoginScreen()));
      return;
    }
    Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => ConverterDetailScreen(converterId: converter.id)),
    );
  }

  Widget _buildShimmerGrid() {
    return GridView.builder(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        mainAxisSpacing: 10,
        crossAxisSpacing: 10,
        childAspectRatio: 0.72,
      ),
      itemCount: 6,
      itemBuilder: (_, __) => const ShimmerCard(height: 180),
    );
  }
}

class _ConverterCard extends StatelessWidget {
  final Converter converter;
  final VoidCallback onTap;

  const _ConverterCard({required this.converter, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Card(
        clipBehavior: Clip.antiAlias,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Image
            Expanded(
              flex: 3,
              child: Container(
                width: double.infinity,
                color: AppTheme.surface,
                child: Image.network(
                  '${ApiConfig.baseUrl}/api/v1/images/thumb/${converter.id}',
                  fit: BoxFit.contain,
                  errorBuilder: (_, __, ___) => Center(
                    child: Icon(Icons.image_not_supported_outlined, size: 40, color: AppTheme.textSecondary.withValues(alpha: 0.3)),
                  ),
                ),
              ),
            ),
            // Info
            Expanded(
              flex: 2,
              child: Padding(
                padding: const EdgeInsets.all(10),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      converter.name ?? 'Unknown',
                      style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 4),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: AppTheme.surface,
                        borderRadius: BorderRadius.circular(4),
                        border: Border.all(color: AppTheme.border, width: 0.5),
                      ),
                      child: Text(
                        converter.brand ?? '',
                        style: TextStyle(fontSize: 10, color: AppTheme.textSecondary),
                      ),
                    ),
                    const Spacer(),
                    // Metal indicators
                    Row(
                      children: [
                        if (converter.hasPt) _metalBadge('Pt'),
                        if (converter.hasPd) _metalBadge('Pd'),
                        if (converter.hasRh) _metalBadge('Rh'),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _metalBadge(String metal) {
    return Container(
      margin: const EdgeInsets.only(right: 4),
      padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
      decoration: BoxDecoration(
        color: AppTheme.primary.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(metal, style: TextStyle(fontSize: 9, color: AppTheme.primary, fontWeight: FontWeight.w600)),
    );
  }
}
