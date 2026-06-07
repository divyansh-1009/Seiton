#pragma once

#include "types.hpp"
#include <vector>
#include <algorithm>

namespace seiton {

class Sorter {
public:
    // First-Fit Decreasing (FFD) sorting strategy: 
    // Sorts the incoming Item vector by volume in descending order.
    // If volumes are identical, resolves ties by base area.
    static void sortItemsFFD(std::vector<Item>& items);
};

} 
