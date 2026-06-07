#include "../include/sorter.hpp"

namespace seiton {

void Sorter::sortItemsFFD(std::vector<Item>& items) {
    std::sort(items.begin(), items.end(), [](const Item& a, const Item& b) {
        double vol_a = a.volume();
        double vol_b = b.volume();
        
        // Allow minor epsilon for floating point comparison if needed, 
        // but exact equality works for discrete dimensions in most cases.
        if (vol_a == vol_b) {
            return a.base_area() > b.base_area();
        }
        return vol_a > vol_b;
    });
}

} 
