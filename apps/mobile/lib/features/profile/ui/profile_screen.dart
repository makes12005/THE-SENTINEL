import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../core/storage/secure_storage.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Profile')),
      body: FutureBuilder<Map<String, String?>>(
        future: _getUserData(),
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }

          final data = snapshot.data ?? {};
          return Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Center(
                  child: CircleAvatar(
                    radius: 50,
                    child: Icon(Icons.person, size: 50),
                  ),
                ),
                const SizedBox(height: 24),
                _buildProfileItem('Role', data['role']?.toUpperCase() ?? 'N/A'),
                _buildProfileItem('Token', data['token'] != null ? 'Active' : 'Missing'),
                const Spacer(),
                SizedBox(
                  width: double.infinity,
                  height: 56,
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
                    onPressed: () async {
                      await SecureStorage.clearAll();
                      if (context.mounted) {
                        context.go('/welcome');
                      }
                    },
                    child: const Text('LOGOUT', style: TextStyle(color: Colors.white, fontSize: 16)),
                  ),
                )
              ],
            ),
          );
        },
      ),
    );
  }

  Future<Map<String, String?>> _getUserData() async {
    return {
      'role': await SecureStorage.getUserRole(),
      'token': await SecureStorage.getToken(),
    };
  }

  Widget _buildProfileItem(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(fontSize: 16, color: Colors.grey)),
          Text(value, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }
}
