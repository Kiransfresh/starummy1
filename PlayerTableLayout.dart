import 'package:flutter/material.dart';
import 'dart:math' as math;
import 'PlayerSeatWidget.dart';

class PlayerTableLayout extends StatelessWidget {
  final List<Map<String, dynamic>> players; // List of player data
  final int? activePlayerIndex;

  const PlayerTableLayout({
    Key? key,
    required this.players,
    this.activePlayerIndex,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final screenSize = MediaQuery.of(context).size;
    final screenWidth = screenSize.width;
    final screenHeight = screenSize.height;
    final centerX = screenWidth / 2;
    final centerY = screenHeight / 2;
    final radiusX = screenWidth * 0.42;
    final radiusY = screenHeight * 0.30;

    // Angles in degrees for each player
    final angles = [90.0, 180.0, 225.0, 270.0, 315.0, 0.0];

    return Stack(
      children: List.generate(6, (index) {
        final angle = angles[index];
        final radian = angle * math.pi / 180.0;
        var offsetX = radiusX * math.cos(radian);
        var offsetY = radiusY * math.sin(radian);

        // Bottom player (angle == 90)
        if (angle == 90) {
          offsetY += screenHeight * 0.08;
        }

        // Top center (angle == 270)
        if (angle == 270) {
          offsetY -= screenHeight * 0.04;
        }

        // Side players (angle == 0 OR 180)
        if (angle == 0 || angle == 180) {
          offsetX *= 0.92;
        }

        final player = index < players.length ? players[index] : null;
        final isLocalPlayer = index == 0;

        return Positioned(
          left: centerX + offsetX - 40, // 80/2 = 40
          top: centerY + offsetY - 40,
          child: SizedBox(
            width: 80,
            height: 80,
            child: player != null
                ? PlayerSeatWidget(
                    playerName: player['name'] ?? 'Player ${index + 1}',
                    avatarUrl: player['avatarUrl'],
                    isActive: activePlayerIndex == index,
                    isLocalPlayer: isLocalPlayer,
                    scale: isLocalPlayer ? 1.1 : 1.0,
                  )
                : PlayerSeatWidget(
                    playerName: 'Empty',
                    scale: isLocalPlayer ? 1.1 : 1.0,
                  ),
          ),
        );
      }),
    );
  }
}