import 'package:flutter/material.dart';

class CardFanLayout extends StatefulWidget {
  final List<Widget> cards;
  final int? selectedIndex;
  final Function(int)? onCardSelected;
  final double overlapFactor; // 0.3 to 0.4 for 30-40% overlap
  final double maxRotation; // in radians, subtle rotation
  final bool enableGrouping; // for multiple sets
  final int cardsPerGroup;

  const CardFanLayout({
    Key? key,
    required this.cards,
    this.selectedIndex,
    this.onCardSelected,
    this.overlapFactor = 0.35,
    this.maxRotation = 0.1,
    this.enableGrouping = false,
    this.cardsPerGroup = 13,
  }) : super(key: key);

  @override
  _CardFanLayoutState createState() => _CardFanLayoutState();
}

class _CardFanLayoutState extends State<CardFanLayout> with TickerProviderStateMixin {
  late AnimationController _animationController;
  late List<Animation<double>> _animations;

  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(
      duration: const Duration(milliseconds: 300),
      vsync: this,
    );
    _animations = List.generate(
      widget.cards.length,
      (index) => Tween<double>(begin: 0, end: 1).animate(
        CurvedAnimation(parent: _animationController, curve: Curves.easeInOut),
      ),
    );
    _animationController.forward();
  }

  @override
  void dispose() {
    _animationController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final screenWidth = MediaQuery.of(context).size.width;
    final cardWidth = 80.0; // Assume standard card width
    final totalWidth = cardWidth * widget.cards.length * (1 - widget.overlapFactor) + cardWidth * widget.overlapFactor;
    final startX = (screenWidth - totalWidth) / 2;

    if (widget.enableGrouping) {
      return _buildGroupedLayout(startX, cardWidth);
    } else {
      return _buildSingleFanLayout(startX, cardWidth);
    }
  }

  Widget _buildSingleFanLayout(double startX, double cardWidth) {
    return SizedBox(
      height: 120, // Adjust based on card height
      child: Stack(
        children: List.generate(widget.cards.length, (index) {
          final position = startX + index * cardWidth * (1 - widget.overlapFactor);
          final rotation = (index - widget.cards.length / 2) * widget.maxRotation / (widget.cards.length / 2);
          final isSelected = widget.selectedIndex == index;
          final yOffset = isSelected ? -20.0 : 0.0;
          final scale = isSelected ? 1.1 : (index == widget.cards.length ~/ 2 ? 1.05 : 1.0);

          return AnimatedPositioned(
            duration: const Duration(milliseconds: 200),
            left: position,
            top: yOffset,
            child: Transform.rotate(
              angle: rotation,
              child: Transform.scale(
                scale: scale,
                child: GestureDetector(
                  onTap: () => widget.onCardSelected?.call(index),
                  child: Container(
                    decoration: BoxDecoration(
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.2),
                          blurRadius: 4,
                          offset: const Offset(2, 2),
                        ),
                      ],
                    ),
                    child: widget.cards[index],
                  ),
                ),
              ),
            ),
          );
        }),
      ),
    );
  }

  Widget _buildGroupedLayout(double startX, double cardWidth) {
    final groups = <List<Widget>>[];
    for (int i = 0; i < widget.cards.length; i += widget.cardsPerGroup) {
      groups.add(widget.cards.sublist(i, i + widget.cardsPerGroup > widget.cards.length ? widget.cards.length : i + widget.cardsPerGroup));
    }

    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: groups.map((group) {
          return Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16.0),
            child: CardFanLayout(
              cards: group,
              selectedIndex: widget.selectedIndex != null && widget.selectedIndex! < group.length ? widget.selectedIndex : null,
              onCardSelected: widget.onCardSelected != null ? (index) => widget.onCardSelected!(groups.indexOf(group) * widget.cardsPerGroup + index) : null,
              overlapFactor: widget.overlapFactor,
              maxRotation: widget.maxRotation,
              enableGrouping: false,
            ),
          );
        }).toList(),
      ),
    );
  }
}