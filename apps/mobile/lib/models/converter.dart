class Converter {
  final int id;
  final String? name;
  final String? brand;
  final String? serialNumber;
  final String? weight;
  final bool hasPt;
  final bool hasPd;
  final bool hasRh;
  final double? calculatedPrice;
  final String? imagePath;

  Converter({
    required this.id,
    this.name,
    this.brand,
    this.serialNumber,
    this.weight,
    this.hasPt = false,
    this.hasPd = false,
    this.hasRh = false,
    this.calculatedPrice,
    this.imagePath,
  });

  factory Converter.fromJson(Map<String, dynamic> json) {
    return Converter(
      id: json['id'] ?? 0,
      name: json['name'],
      brand: json['brand'],
      serialNumber: json['serialNumber'],
      weight: json['weight']?.toString(),
      hasPt: json['hasPt'] ?? false,
      hasPd: json['hasPd'] ?? false,
      hasRh: json['hasRh'] ?? false,
      calculatedPrice: json['calculatedPrice'] != null
          ? double.tryParse(json['calculatedPrice'].toString())
          : null,
      imagePath: json['imagePath'],
    );
  }
}

class Brand {
  final String name;
  final int count;

  Brand({required this.name, required this.count});

  factory Brand.fromJson(Map<String, dynamic> json) {
    return Brand(
      name: json['brand'] ?? json['name'] ?? '',
      count: json['count'] ?? 0,
    );
  }
}
