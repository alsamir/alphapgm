import 'package:flutter_test/flutter_test.dart';

import 'package:catalyser_mobile/main.dart';

void main() {
  testWidgets('App renders splash screen', (WidgetTester tester) async {
    await tester.pumpWidget(const CatalyserApp());
    expect(find.text('Catalyser'), findsOneWidget);
  });
}
