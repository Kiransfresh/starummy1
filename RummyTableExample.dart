import 'package:flutter/material.dart';
import 'PlayerTableLayout.dart';

class RummyTableExample extends StatefulWidget {
  const RummyTableExample({Key? key}) : super(key: key);

  @override
  _RummyTableExampleState createState() => _RummyTableExampleState();
}

class _RummyTableExampleState extends State<RummyTableExample> {
  int activePlayerIndex = 0;

  // Example player data
  final List<Map<String, dynamic>> players = [
    {'name': 'You', 'avatarUrl': null},
    {'name': 'Alice', 'avatarUrl': null},
    {'name': 'Bob', 'avatarUrl': null},
    {'name': 'Charlie', 'avatarUrl': null},
    {'name': 'Diana', 'avatarUrl': null},
    {'name': 'Eve', 'avatarUrl': null},
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('6-Player Rummy Table'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () {
              setState(() {
                activePlayerIndex = (activePlayerIndex + 1) % 6;
              });
            },
          ),
        ],
      ),
      body: SafeArea(
        child: Container(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [Colors.green, Colors.greenAccent],
            ),
          ),
          child: Stack(
            children: [
              // Center table area
              Center(
                child: Container(
                  width: 200,
                  height: 200,
                  decoration: BoxDecoration(
                    color: Colors.green[800],
                    borderRadius: BorderRadius.circular(100),
                    border: Border.all(color: Colors.white, width: 4),
                  ),
                  child: const Center(
                    child: Text(
                      'TABLE',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 24,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ),
              ),
              // Player seats
              PlayerTableLayout(
                players: players,
                activePlayerIndex: activePlayerIndex,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// Example with fewer players (shows empty seats)
class PartialTableExample extends StatelessWidget {
  const PartialTableExample({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final partialPlayers = [
      {'name': 'Player 1', 'avatarUrl': null},
      {'name': 'Player 2', 'avatarUrl': null},
      {'name': 'Player 3', 'avatarUrl': null},
    ];

    return Scaffold(
      appBar: AppBar(title: const Text('Partial Table Example')),
      body: SafeArea(
        child: Container(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [Colors.blue, Colors.blueAccent],
            ),
          ),
          child: Stack(
            children: [
              Center(
                child: Container(
                  width: 150,
                  height: 150,
                  decoration: BoxDecoration(
                    color: Colors.blue[800],
                    borderRadius: BorderRadius.circular(75),
                    border: Border.all(color: Colors.white, width: 4),
                  ),
                  child: const Center(
                    child: Text(
                      'GAME',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ),
              ),
              PlayerTableLayout(
                players: partialPlayers,
                activePlayerIndex: 1,
              ),
            ],
          ),
        ),
      ),
    );
  }
}