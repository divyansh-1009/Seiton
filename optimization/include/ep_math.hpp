#pragma once

#include "types.hpp"
#include <vector>

namespace seiton {

// Represents an item that has been placed inside the container.
// This is essential for collision detection, equilibrium, and fragility checks.
struct PlacedItem {
    Item item;
    Coordinate position;
    
    // Bounding box helpers for intersection checks
    [[nodiscard]] double max_x() const { return position.x + item.l; }
    [[nodiscard]] double max_y() const { return position.y + item.w; }
    [[nodiscard]] double max_z() const { return position.z + item.h; }
};

class EPMath {
public:
    // Core EP Update:
    // Generates up to 3 new extreme points (top, front, right) when an item is placed.
    // Automatically bounds checks against container limits.
    static std::vector<Coordinate> generateNewEPs(
        const Coordinate& current_ep,
        const Item& placed_item,
        const Container& container);

    // Validation 1: Fragility Constraint
    // Rule: A heavier box cannot be placed on a box with a higher fragility index.
    static bool validateFragility(
        const Item& new_item, 
        const Coordinate& new_pos, 
        const std::vector<PlacedItem>& placed_items);

    // Validation 2: Equilibrium Constraint
    // Rule: The center of gravity (approximated by base support) must be supported 
    // by at least 70% of the surface area beneath it.
    static bool validateEquilibrium(
        const Item& new_item, 
        const Coordinate& new_pos, 
        const std::vector<PlacedItem>& placed_items);
        
    // Collision Detection Helper
    // Ensures the item does not intersect with any already placed items.
    static bool noCollision(
        const Item& new_item,
        const Coordinate& new_pos,
        const std::vector<PlacedItem>& placed_items);
};

} 
