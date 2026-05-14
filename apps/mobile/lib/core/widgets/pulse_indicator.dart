import 'package:flutter/material.dart';
import '../theme/app_colors.dart';

class PulseIndicator extends StatefulWidget {
  final Color color;
  final double size;

  const PulseIndicator({
    super.key,
    this.color = AppColors.tertiary,
    this.size = 12,
  });

  @override
  State<PulseIndicator> createState() => _PulseIndicatorState();
}

class _PulseIndicatorState extends State<PulseIndicator>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        return Container(
          width: widget.size,
          height: widget.size,
          decoration: BoxDecoration(
            color: widget.color.withOpacity(0.2 + (0.8 * _controller.value)),
            shape: BoxShape.circle,
            boxShadow: [
              BoxShadow(
                color: widget.color.withOpacity(0.3 * _controller.value),
                blurRadius: widget.size * 0.7,
                spreadRadius: widget.size * 0.2,
              ),
            ],
          ),
        );
      },
    );
  }
}
