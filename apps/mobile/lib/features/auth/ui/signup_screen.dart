import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../provider/auth_provider.dart';
import '../../../core/router/app_router.dart';
import '../../../core/theme/app_colors.dart';

class SignupScreen extends ConsumerStatefulWidget {
  const SignupScreen({super.key});

  @override
  ConsumerState<SignupScreen> createState() => _SignupScreenState();
}

class _SignupScreenState extends ConsumerState<SignupScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameCon = TextEditingController();
  final _passCon = TextEditingController();
  final _inviteCon = TextEditingController();
  bool _obscure = true;
  int _step = 0;

  @override
  void dispose() {
    _nameCon.dispose();
    _passCon.dispose();
    _inviteCon.dispose();
    super.dispose();
  }

  Future<void> _onSignup() async {
    if (!_formKey.currentState!.validate()) return;
    final success = await ref.read(authProvider.notifier).signup(
      name: _nameCon.text.trim(),
      password: _passCon.text,
      inviteCode: _inviteCon.text.trim(),
    );
    if (success && mounted) {
      context.go(routeForRole(ref.read(authProvider).role));
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authProvider);
    final contact = auth.identifier ?? '';
    final isEmail = contact.contains('@');

    ref.listen<AuthState>(authProvider, (prev, next) {
      if (next.error != null && next.error != prev?.error) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(next.error!), backgroundColor: AppColors.errorContainer),
        );
      }
    });

    return Scaffold(
      appBar: AppBar(
        title: Text(_step == 0 ? 'Access Code' : 'Profile Setup'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () {
            if (_step == 1) {
              setState(() => _step = 0);
            } else {
              context.pop();
            }
          },
        ),
      ),
      body: SafeArea(
        child: _step == 0
            ? Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  children: [
                    TextFormField(
                      controller: _inviteCon,
                      textCapitalization: TextCapitalization.characters,
                      decoration: const InputDecoration(labelText: 'Agency Invite Code'),
                    ),
                    const SizedBox(height: 16),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: () => setState(() => _step = 1),
                        child: const Text('Continue'),
                      ),
                    ),
                  ],
                ),
              )
            : Form(
                key: _formKey,
                child: ListView(
                  padding: const EdgeInsets.all(24),
                  children: [
                    TextFormField(
                      controller: _nameCon,
                      decoration: const InputDecoration(labelText: 'Full Name'),
                      validator: (v) => (v == null || v.isEmpty) ? 'Name is required' : null,
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      enabled: false,
                      initialValue: contact,
                      decoration: InputDecoration(labelText: isEmail ? 'Email' : 'Phone'),
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: _passCon,
                      obscureText: _obscure,
                      decoration: InputDecoration(
                        labelText: 'Password',
                        suffixIcon: IconButton(
                          onPressed: () => setState(() => _obscure = !_obscure),
                          icon: Icon(_obscure ? Icons.visibility : Icons.visibility_off),
                        ),
                      ),
                      validator: (v) {
                        if (v == null || v.isEmpty) return 'Password is required';
                        if (v.length < 6) return 'Password too short (min 6)';
                        return null;
                      },
                    ),
                    const SizedBox(height: 24),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: auth.isLoading ? null : _onSignup,
                        child: auth.isLoading
                            ? const SizedBox(
                                width: 18,
                                height: 18,
                                child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.onPrimary),
                              )
                            : const Text('Complete Setup'),
                      ),
                    ),
                  ],
                ),
              ),
      ),
    );
  }
}
