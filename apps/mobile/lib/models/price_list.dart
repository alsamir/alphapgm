class PriceListSummary {
  final int id;
  final String name;
  final String status;
  final int itemCount;
  final double total;
  final String createdAt;
  final String updatedAt;

  PriceListSummary({
    required this.id,
    required this.name,
    required this.status,
    required this.itemCount,
    required this.total,
    required this.createdAt,
    required this.updatedAt,
  });

  factory PriceListSummary.fromJson(Map<String, dynamic> json) {
    return PriceListSummary(
      id: json['id'] ?? 0,
      name: json['name'] ?? '',
      status: json['status'] ?? 'draft',
      itemCount: json['itemCount'] ?? 0,
      total: (json['total'] ?? 0).toDouble(),
      createdAt: json['createdAt'] ?? '',
      updatedAt: json['updatedAt'] ?? '',
    );
  }
}

class PriceListDetail {
  final int id;
  final String name;
  final String status;
  final List<PriceListItem> items;
  final double total;
  final String createdAt;
  final String updatedAt;

  PriceListDetail({
    required this.id,
    required this.name,
    required this.status,
    required this.items,
    required this.total,
    required this.createdAt,
    required this.updatedAt,
  });

  factory PriceListDetail.fromJson(Map<String, dynamic> json) {
    return PriceListDetail(
      id: json['id'] ?? 0,
      name: json['name'] ?? '',
      status: json['status'] ?? 'draft',
      items: (json['items'] as List?)
              ?.map((i) => PriceListItem.fromJson(i))
              .toList() ??
          [],
      total: (json['total'] ?? 0).toDouble(),
      createdAt: json['createdAt'] ?? '',
      updatedAt: json['updatedAt'] ?? '',
    );
  }
}

class PriceListItem {
  final int id;
  final int converterId;
  final String converterName;
  final String converterBrand;
  final int quantity;
  final double? unitPrice;
  final double? totalPrice;
  final String createdAt;

  PriceListItem({
    required this.id,
    required this.converterId,
    required this.converterName,
    required this.converterBrand,
    required this.quantity,
    this.unitPrice,
    this.totalPrice,
    this.createdAt = '',
  });

  factory PriceListItem.fromJson(Map<String, dynamic> json) {
    return PriceListItem(
      id: json['id'] ?? 0,
      converterId: json['converterId'] ?? 0,
      converterName: json['converterName'] ?? 'Unknown',
      converterBrand: json['converterBrand'] ?? 'Unknown',
      quantity: json['quantity'] ?? 1,
      unitPrice: json['unitPrice'] != null ? (json['unitPrice']).toDouble() : null,
      totalPrice: json['totalPrice'] != null ? (json['totalPrice']).toDouble() : null,
      createdAt: json['createdAt'] ?? '',
    );
  }
}
