#pragma once
#include "types.hpp"
#include "ep_math.hpp"
#include "sorter.hpp"

namespace seiton {

class Engine {
public:
    static ExecutionMatrix pack(const Container& container, std::vector<Item> items);
};

}
