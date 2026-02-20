import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import '../../config/theme.dart';
import '../../providers/auth_provider.dart';
import '../../services/api_service.dart';

class ChatScreen extends StatefulWidget {
  const ChatScreen({super.key});

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final ApiService _api = ApiService();
  final TextEditingController _inputController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  final FocusNode _focusNode = FocusNode();
  final ImagePicker _picker = ImagePicker();

  final List<_ChatMessage> _messages = [];
  bool _loading = false;
  bool _identifying = false;
  int? _chatId;
  int? _creditsRemaining;
  int? _aiQueriesRemaining;

  @override
  void dispose() {
    _inputController.dispose();
    _scrollController.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _sendMessage([String? prefill]) async {
    final text = (prefill ?? _inputController.text).trim();
    if (text.isEmpty || _loading) return;

    final token = context.read<AuthProvider>().token;
    if (token == null) return;

    _inputController.clear();
    setState(() {
      _messages.add(_ChatMessage(role: 'user', content: text));
      _loading = true;
    });
    _scrollToBottom();

    try {
      final res = await _api.sendAiMessage(text, _chatId, token);
      if (res['data'] != null) {
        setState(() {
          _messages.add(_ChatMessage(role: 'assistant', content: res['data']['message'] ?? ''));
          _chatId = res['data']['chatId'];
          _creditsRemaining = res['data']['creditsRemaining'];
          _aiQueriesRemaining = res['data']['aiQueriesRemaining'];
        });
      }
    } catch (e) {
      final errorMsg = e.toString();
      String displayMsg;
      if (errorMsg.contains('Insufficient credits')) {
        displayMsg = "You don't have enough credits. Please purchase more from your dashboard.";
      } else if (errorMsg.contains('not configured')) {
        displayMsg = 'AI assistant is currently unavailable. Please try again later.';
      } else {
        displayMsg = 'Sorry, something went wrong. $errorMsg';
      }
      setState(() {
        _messages.add(_ChatMessage(role: 'assistant', content: displayMsg));
      });
    } finally {
      setState(() => _loading = false);
      _scrollToBottom();
    }
  }

  void _showImagePicker() {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppTheme.cardColor,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 40,
                height: 4,
                margin: const EdgeInsets.only(bottom: 16),
                decoration: BoxDecoration(
                  color: AppTheme.border,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              Text('Identify Converter', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 16)),
              const SizedBox(height: 4),
              Text('Take a photo or choose from gallery', style: TextStyle(color: AppTheme.textSecondary, fontSize: 13)),
              const SizedBox(height: 16),
              ListTile(
                leading: Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: AppTheme.primary.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(Icons.camera_alt, color: AppTheme.primary),
                ),
                title: const Text('Take Photo'),
                subtitle: Text('Use camera to capture converter', style: TextStyle(color: AppTheme.textSecondary, fontSize: 12)),
                onTap: () {
                  Navigator.pop(ctx);
                  _pickImage(ImageSource.camera);
                },
              ),
              ListTile(
                leading: Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: AppTheme.primary.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(Icons.photo_library, color: AppTheme.primary),
                ),
                title: const Text('Choose from Gallery'),
                subtitle: Text('Select an existing photo', style: TextStyle(color: AppTheme.textSecondary, fontSize: 12)),
                onTap: () {
                  Navigator.pop(ctx);
                  _pickImage(ImageSource.gallery);
                },
              ),
              const SizedBox(height: 8),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Text(
                  'Image identification costs 1 credit',
                  style: TextStyle(color: AppTheme.textSecondary, fontSize: 11),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _pickImage(ImageSource source) async {
    try {
      final XFile? picked = await _picker.pickImage(
        source: source,
        maxWidth: 1024,
        maxHeight: 1024,
        imageQuality: 85,
      );
      if (picked == null) return;
      await _identifyImage(File(picked.path));
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to pick image: $e'), backgroundColor: AppTheme.error),
        );
      }
    }
  }

  Future<void> _identifyImage(File imageFile) async {
    final token = context.read<AuthProvider>().token;
    if (token == null) return;

    setState(() {
      _messages.add(_ChatMessage(role: 'user', content: 'Identify this converter', imageFile: imageFile));
      _identifying = true;
      _loading = true;
    });
    _scrollToBottom();

    try {
      final res = await _api.identifyConverterByImage(imageFile, token);
      if (res['data'] != null) {
        setState(() {
          _messages.add(_ChatMessage(role: 'assistant', content: res['data']['message'] ?? 'Could not identify the converter.'));
          _creditsRemaining = res['data']['creditsRemaining'];
          _aiQueriesRemaining = res['data']['aiQueriesRemaining'];
        });
      }
    } catch (e) {
      final errorMsg = e.toString();
      String displayMsg;
      if (errorMsg.contains('Insufficient credits')) {
        displayMsg = "You don't have enough credits for image identification.";
      } else {
        displayMsg = 'Failed to identify converter. $errorMsg';
      }
      setState(() {
        _messages.add(_ChatMessage(role: 'assistant', content: displayMsg));
      });
    } finally {
      setState(() {
        _identifying = false;
        _loading = false;
      });
      _scrollToBottom();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: AppTheme.primary.withValues(alpha: 0.2),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(Icons.smart_toy, color: AppTheme.primary, size: 20),
            ),
            const SizedBox(width: 10),
            const Text('AI Assistant'),
          ],
        ),
        actions: [
          if (_creditsRemaining != null || _aiQueriesRemaining != null)
            Padding(
              padding: const EdgeInsets.only(right: 12),
              child: Center(
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppTheme.surface,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppTheme.border),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.monetization_on, size: 14, color: AppTheme.primary),
                      const SizedBox(width: 4),
                      Text('${_creditsRemaining ?? '-'}', style: TextStyle(fontSize: 12, color: AppTheme.textSecondary)),
                      if (_aiQueriesRemaining != null) ...[
                        Container(
                          width: 1, height: 12,
                          margin: const EdgeInsets.symmetric(horizontal: 6),
                          color: AppTheme.border,
                        ),
                        Icon(Icons.smart_toy, size: 12, color: AppTheme.primary),
                        const SizedBox(width: 3),
                        Text('$_aiQueriesRemaining', style: TextStyle(fontSize: 11, color: AppTheme.textSecondary)),
                      ],
                    ],
                  ),
                ),
              ),
            ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: _messages.isEmpty
                ? _buildEmptyState()
                : ListView.builder(
                    controller: _scrollController,
                    padding: const EdgeInsets.all(16),
                    itemCount: _messages.length + (_loading ? 1 : 0),
                    itemBuilder: (context, index) {
                      if (index == _messages.length) {
                        return _identifying ? _buildIdentifyingIndicator() : _buildTypingIndicator();
                      }
                      return _buildMessage(_messages[index]);
                    },
                  ),
          ),
          // Input
          Container(
            padding: const EdgeInsets.fromLTRB(12, 8, 12, 8),
            decoration: BoxDecoration(
              color: AppTheme.surface,
              border: Border(top: BorderSide(color: AppTheme.border)),
            ),
            child: SafeArea(
              top: false,
              child: Row(
                children: [
                  // Camera button
                  Container(
                    decoration: BoxDecoration(
                      color: AppTheme.primary.withValues(alpha: 0.1),
                      shape: BoxShape.circle,
                    ),
                    child: IconButton(
                      onPressed: _loading ? null : _showImagePicker,
                      icon: Icon(Icons.camera_alt, color: _loading ? AppTheme.textSecondary : AppTheme.primary, size: 20),
                      constraints: const BoxConstraints(minHeight: 40, minWidth: 40),
                      padding: EdgeInsets.zero,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: TextField(
                      controller: _inputController,
                      focusNode: _focusNode,
                      decoration: InputDecoration(
                        hintText: 'Ask about any converter...',
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(24),
                          borderSide: BorderSide(color: AppTheme.border),
                        ),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(24),
                          borderSide: BorderSide(color: AppTheme.border),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(24),
                          borderSide: BorderSide(color: AppTheme.primary),
                        ),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                        isDense: true,
                      ),
                      textInputAction: TextInputAction.send,
                      onSubmitted: (_) => _sendMessage(),
                      enabled: !_loading,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Container(
                    decoration: BoxDecoration(
                      color: AppTheme.primary,
                      shape: BoxShape.circle,
                    ),
                    child: IconButton(
                      onPressed: _loading ? null : () => _sendMessage(),
                      icon: Icon(Icons.send, color: AppTheme.background, size: 20),
                      constraints: const BoxConstraints(minHeight: 40, minWidth: 40),
                      padding: EdgeInsets.zero,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState() {
    final suggestions = [
      'Price of BMW 1740060?',
      'Most valuable Toyota converters?',
      "Today's metal prices?",
    ];

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppTheme.primary.withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
              child: Icon(Icons.smart_toy, size: 48, color: AppTheme.primary.withValues(alpha: 0.5)),
            ),
            const SizedBox(height: 16),
            Text('Ask me about any converter!', style: TextStyle(color: AppTheme.textSecondary, fontSize: 15)),
            const SizedBox(height: 8),
            Text('Or snap a photo to identify one', style: TextStyle(color: AppTheme.textSecondary.withValues(alpha: 0.6), fontSize: 13)),
            const SizedBox(height: 20),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              alignment: WrapAlignment.center,
              children: suggestions.map((q) {
                return GestureDetector(
                  onTap: () => _sendMessage(q),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                    decoration: BoxDecoration(
                      color: AppTheme.primary.withValues(alpha: 0.08),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: AppTheme.primary.withValues(alpha: 0.2)),
                    ),
                    child: Text(q, style: TextStyle(color: AppTheme.primary.withValues(alpha: 0.8), fontSize: 13)),
                  ),
                );
              }).toList(),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMessage(_ChatMessage msg) {
    final isUser = msg.role == 'user';
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        mainAxisAlignment: isUser ? MainAxisAlignment.end : MainAxisAlignment.start,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (!isUser) ...[
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: AppTheme.primary.withValues(alpha: 0.2),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(Icons.smart_toy, color: AppTheme.primary, size: 16),
            ),
            const SizedBox(width: 8),
          ],
          Flexible(
            child: Column(
              crossAxisAlignment: isUser ? CrossAxisAlignment.end : CrossAxisAlignment.start,
              children: [
                if (msg.imageFile != null)
                  ClipRRect(
                    borderRadius: BorderRadius.circular(12),
                    child: Image.file(
                      msg.imageFile!,
                      width: 200,
                      height: 200,
                      fit: BoxFit.cover,
                    ),
                  ),
                if (msg.imageFile != null) const SizedBox(height: 6),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  decoration: BoxDecoration(
                    color: isUser ? AppTheme.primary.withValues(alpha: 0.2) : AppTheme.cardColor,
                    borderRadius: BorderRadius.circular(16).copyWith(
                      bottomRight: isUser ? const Radius.circular(4) : null,
                      bottomLeft: !isUser ? const Radius.circular(4) : null,
                    ),
                  ),
                  child: Text(msg.content, style: const TextStyle(fontSize: 14, height: 1.4)),
                ),
              ],
            ),
          ),
          if (isUser) ...[
            const SizedBox(width: 8),
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: AppTheme.surface,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(Icons.person, color: AppTheme.textSecondary, size: 16),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildTypingIndicator() {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(6),
            decoration: BoxDecoration(
              color: AppTheme.primary.withValues(alpha: 0.2),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(Icons.smart_toy, color: AppTheme.primary, size: 16),
          ),
          const SizedBox(width: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: AppTheme.cardColor,
              borderRadius: BorderRadius.circular(16).copyWith(bottomLeft: const Radius.circular(4)),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: List.generate(3, (i) {
                return TweenAnimationBuilder<double>(
                  tween: Tween(begin: 0.0, end: 1.0),
                  duration: Duration(milliseconds: 600 + i * 200),
                  builder: (context, value, child) {
                    return Container(
                      margin: const EdgeInsets.symmetric(horizontal: 2),
                      width: 7, height: 7,
                      decoration: BoxDecoration(
                        color: AppTheme.primary.withValues(alpha: 0.4 + value * 0.6),
                        shape: BoxShape.circle,
                      ),
                    );
                  },
                );
              }),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildIdentifyingIndicator() {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(6),
            decoration: BoxDecoration(
              color: AppTheme.primary.withValues(alpha: 0.2),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(Icons.smart_toy, color: AppTheme.primary, size: 16),
          ),
          const SizedBox(width: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: AppTheme.cardColor,
              borderRadius: BorderRadius.circular(16).copyWith(bottomLeft: const Radius.circular(4)),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: AppTheme.primary)),
                const SizedBox(width: 10),
                Text('Identifying converter...', style: TextStyle(color: AppTheme.textSecondary, fontSize: 13)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _ChatMessage {
  final String role;
  final String content;
  final File? imageFile;

  _ChatMessage({required this.role, required this.content, this.imageFile});
}
