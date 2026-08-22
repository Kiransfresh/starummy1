import 'package:flutter/material.dart';
import 'CardFanLayout.dart';
import 'CardWidget.dart';

class RummyHandExample extends StatefulWidget {
  const RummyHandExample({Key? key}) : super(key: key);

  @override
  _RummyHandExampleState createState() => _RummyHandExampleState();
}

class _RummyHandExampleState extends State<RummyHandExample> {
  int? selectedCardIndex;

  // Example cards data - replace with your game logic
  final List<Map<String, String>> playerCards = [
    {'suit': '♠', 'rank': 'A'},
    {'suit': '♥', 'rank': 'K'},
    {'suit': '♦', 'rank': 'Q'},
    {'suit': '♣', 'rank': 'J'},
    {'suit': '♠', 'rank': '10'},
    {'suit': '♥', 'rank': '9'},
    {'suit': '♦', 'rank': '8'},
    {'suit': '♣', 'rank': '7'},
    {'suit': '♠', 'rank': '6'},
    {'suit': '♥', 'rank': '5'},
    {'suit': '♦', 'rank': '4'},
    {'suit': '♣', 'rank': '3'},
    {'suit': '♠', 'rank': '2'},
  ];

  @override
  Widget build(BuildContext context) {
    final cardWidgets = playerCards.map((card) {
      final index = playerCards.indexOf(card);
      return CardWidget(
        suit: card['suit']!,
        rank: card['rank']!,
        isSelected: selectedCardIndex == index,
        onTap: () {
          setState(() {
            selectedCardIndex = selectedCardIndex == index ? null : index;
          });
        },
      );
    }).toList();

    return Scaffold(
      appBar: AppBar(title: const Text('Rummy Hand Example')),
      body: Column(
        children: [
          // Game table area
          Expanded(
            child: Container(
              color: Colors.green[200],
              child: const Center(child: Text('Game Table')),
            ),
          ),
          // Player hand at bottom
          Container(
            height: 140,
            color: Colors.brown[100],
            child: CardFanLayout(
              cards: cardWidgets,
              selectedIndex: selectedCardIndex,
              onCardSelected: (index) {
                setState(() {
                  selectedCardIndex = index;
                });
              },
              overlapFactor: 0.35,
              maxRotation: 0.08,
              enableGrouping: false, // Set to true for multiple melds
            ),
          ),
        ],
      ),
    );
  }
}

// Example with grouping (for melds)
class GroupedRummyHandExample extends StatefulWidget {
  const GroupedRummyHandExample({Key? key}) : super(key: key);

  @override
  _GroupedRummyHandExampleState createState() => _GroupedRummyHandExampleState();
}

class _GroupedRummyHandExampleState extends State<GroupedRummyHandExample> {
  int? selectedCardIndex;

  // Example grouped cards - each sublist is a meld
  final List<List<Map<String, String>>> melds = [
    [
      {'suit': '♠', 'rank': 'A'},
      {'suit': '♥', 'rank': 'A'},
      {'suit': '♦', 'rank': 'A'},
    ],
    [
      {'suit': '♣', 'rank': 'K'},
      {'suit': '♣', 'rank': 'Q'},
      {'suit': '♣', 'rank': 'J'},
    ],
    [
      {'suit': '♦', 'rank': '7'},
      {'suit': '♦', 'rank': '8'},
      {'suit': '♦', 'rank': '9'},
      {'suit': '♦', 'rank': '10'},
    ],
  ];

  @override
  Widget build(BuildContext context) {
    final allCards = melds.expand((meld) => meld).toList();
    final cardWidgets = allCards.map((card) {
      final globalIndex = allCards.indexOf(card);
      return CardWidget(
        suit: card['suit']!,
        rank: card['rank']!,
        isSelected: selectedCardIndex == globalIndex,
        onTap: () {
          setState(() {
            selectedCardIndex = selectedCardIndex == globalIndex ? null : globalIndex;
          });
        },
      );
    }).toList();

    return Scaffold(
      appBar: AppBar(title: const Text('Grouped Rummy Hand Example')),
      body: Column(
        children: [
          Expanded(
            child: Container(
              color: Colors.green[200],
              child: const Center(child: Text('Game Table')),
            ),
          ),
          Container(
            height: 140,
            color: Colors.brown[100],
            child: CardFanLayout(
              cards: cardWidgets,
              selectedIndex: selectedCardIndex,
              onCardSelected: (index) {
                setState(() {
                  selectedCardIndex = index;
                });
              },
              overlapFactor: 0.35,
              maxRotation: 0.08,
              enableGrouping: true,
              cardsPerGroup: 3, // Adjust based on meld size
            ),
          ),
        ],
      ),
    );
  }
}