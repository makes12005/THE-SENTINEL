import 'package:flutter/foundation.dart';

/// A global [ChangeNotifier] that signals GoRouter to re-evaluate its redirect
/// guard whenever the session state changes (e.g., forced logout after 401).
///
/// Usage:
///   - Call [SessionNotifier.instance.invalidate()] from anywhere (e.g., the
///     token interceptor) to trigger a router refresh.
///   - GoRouter uses this as its [refreshListenable].
class SessionNotifier extends ChangeNotifier {
  SessionNotifier._();

  static final SessionNotifier instance = SessionNotifier._();

  /// Call this when the session has been forcibly cleared (e.g., refresh token
  /// expired). GoRouter will re-run its redirect guard, see no valid session,
  /// and navigate to /welcome.
  void invalidate() {
    notifyListeners();
  }
}
