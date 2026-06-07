#include "../include/ep_math.hpp"
#include <algorithm>

namespace seiton {

std::vector<Coordinate> EPMath::generateNewEPs(
    const Coordinate& current_ep,
    const Item& placed_item,
    const Container& container) {
    
    std::vector<Coordinate> new_eps;

    // 1. Top EP (projecting along Z axis)
    Coordinate top_ep{
        current_ep.x,
        current_ep.y,
        current_ep.z + placed_item.h
    };
    if (top_ep.z < container.max_h_cm) {
        new_eps.push_back(top_ep);
    }

    // 2. Front EP (projecting along Y axis)
    Coordinate front_ep{
        current_ep.x,
        current_ep.y + placed_item.w,
        current_ep.z
    };
    if (front_ep.y < container.max_w_cm) {
        new_eps.push_back(front_ep);
    }

    // 3. Right EP (projecting along X axis)
    Coordinate right_ep{
        current_ep.x + placed_item.l,
        current_ep.y,
        current_ep.z
    };
    if (right_ep.x < container.max_l_cm) {
        new_eps.push_back(right_ep);
    }

    return new_eps;
}

bool EPMath::noCollision(
    const Item& new_item,
    const Coordinate& new_pos,
    const std::vector<PlacedItem>& placed_items) {
    
    double nx_max = new_pos.x + new_item.l;
    double ny_max = new_pos.y + new_item.w;
    double nz_max = new_pos.z + new_item.h;

    for (const auto& pi : placed_items) {
        // Check for 3D AABB intersection
        bool intersect_x = (new_pos.x < pi.max_x()) && (nx_max > pi.position.x);
        bool intersect_y = (new_pos.y < pi.max_y()) && (ny_max > pi.position.y);
        bool intersect_z = (new_pos.z < pi.max_z()) && (nz_max > pi.position.z);

        if (intersect_x && intersect_y && intersect_z) {
            return false; // Collision detected
        }
    }
    return true;
}

bool EPMath::validateFragility(
    const Item& new_item, 
    const Coordinate& new_pos, 
    const std::vector<PlacedItem>& placed_items) {
    
    // If placing on the floor of the container, fragility is not violated from beneath
    if (new_pos.z == 0.0) return true;

    for (const auto& pi : placed_items) {
        // Check if `pi` is directly beneath `new_item`
        if (new_pos.z == pi.max_z()) {
            bool intersect_x = (new_pos.x < pi.max_x()) && ((new_pos.x + new_item.l) > pi.position.x);
            bool intersect_y = (new_pos.y < pi.max_y()) && ((new_pos.y + new_item.w) > pi.position.y);
            
            if (intersect_x && intersect_y) {
                // Rule: No item can ever be stacked on top of an item where fragile == true
                if (pi.item.fragile) {
                    return false;
                }
            }
        }
    }
    return true;
}

bool EPMath::validateEquilibrium(
    const Item& new_item, 
    const Coordinate& new_pos, 
    const std::vector<PlacedItem>& placed_items) {
    
    // If placing on the floor, it's fully supported (100%)
    if (new_pos.z == 0.0) return true;

    double supported_area = 0.0;
    double base_area = new_item.base_area();

    for (const auto& pi : placed_items) {
        // Find items directly beneath
        if (new_pos.z == pi.max_z()) {
            // Calculate overlap rectangle in XY plane
            double overlap_x_start = std::max(new_pos.x, pi.position.x);
            double overlap_x_end = std::min(new_pos.x + new_item.l, pi.max_x());
            
            double overlap_y_start = std::max(new_pos.y, pi.position.y);
            double overlap_y_end = std::min(new_pos.y + new_item.w, pi.max_y());
            
            if (overlap_x_start < overlap_x_end && overlap_y_start < overlap_y_end) {
                double area = (overlap_x_end - overlap_x_start) * (overlap_y_end - overlap_y_start);
                supported_area += area;
            }
        }
    }

    // Must be supported by at least 70%
    return (supported_area / base_area) >= 0.70;
}

} 
