import 'package:flutter/material.dart';

class PlayerSeatWidget extends StatelessWidget {
  final String playerName;
  final String? avatarUrl;
  final bool isActive;
  final bool isLocalPlayer;
  final double scale;

  const PlayerSeatWidget({
    Key? key,
    required this.playerName,
    this.avatarUrl,
    this.isActive = false,
    this.isLocalPlayer = false,
    this.scale = 1.0,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Transform.scale(
      scale: scale,
      child: Container(
        width: 80,
        height: 80,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: isActive ? Colors.blue.withOpacity(0.3) : Colors.grey.withOpacity(0.2),
          border: Border.all(
            color: isActive ? Colors.blue : Colors.grey,
            width: 2,
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.2),
              blurRadius: 4,
              offset: const Offset(2, 2),
            ),
          ],
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            CircleAvatar(
              radius: 25,
              backgroundImage: avatarUrl != null ? NetworkImage(avatarUrl!) : null,
              backgroundColor: Colors.white,
              child: avatarUrl == null
                  ? Text(
                      playerName.isNotEmpty ? playerName[0].toUpperCase() : '?',
                      style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                    )
                  : null,
            ),
            const SizedBox(height: 4),
            Text(
              playerName,
              style: TextStyle(
                fontSize: 12,
                fontWeight: isLocalPlayer ? FontWeight.bold : FontWeight.normal,
                color: isActive ? Colors.blue : Colors.black,
              ),
              textAlign: TextAlign.center,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      ),
    );
  }
}