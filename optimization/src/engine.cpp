#include "../include/engine.hpp"

namespace seiton {

ExecutionMatrix Engine::pack(const Container& container, std::vector<Item> items) {
    ExecutionMatrix result;
    result.optimization_status = "SUCCESS";
    
    Sorter::sortItemsFFD(items);
    
    std::vector<Coordinate> eps;
    eps.push_back({0.0, 0.0, 0.0});
    
    std::vector<PlacedItem> placed_items;
    double used_volume = 0.0;
    int step_counter = 1;
    
    for (const auto& item : items) {
        bool placed = false;
        
        // Sort EPs (Z, then Y, then X) for packing heuristic
        std::sort(eps.begin(), eps.end(), [](const Coordinate& a, const Coordinate& b){
            if (a.z != b.z) return a.z < b.z;
            if (a.y != b.y) return a.y < b.y;
            return a.x < b.x;
        });
        
        for (auto it = eps.begin(); it != eps.end(); ++it) {
            Coordinate ep = *it;
            
            // Check container boundaries
            if (ep.x + item.l > container.max_l_cm ||
                ep.y + item.w > container.max_w_cm ||
                ep.z + item.h > container.max_h_cm) {
                continue;
            }
            
            if (!EPMath::noCollision(item, ep, placed_items)) continue;
            if (!EPMath::validateFragility(item, ep, placed_items)) continue;
            if (!EPMath::validateEquilibrium(item, ep, placed_items)) continue;
            
            // Valid placement
            placed = true;
            placed_items.push_back({item, ep});
            used_volume += item.volume();
            
            TargetCoordinate tc;
            tc.x = ep.x;
            tc.y = ep.y;
            tc.z = ep.z;
            tc.rotation_deg = 0;
            
            result.sequence.push_back(Step{
                step_counter++,
                item.id,
                tc
            });
            
            eps.erase(it);
            
            auto new_eps = EPMath::generateNewEPs(ep, item, container);
            for (const auto& nep : new_eps) {
                eps.push_back(nep);
            }
            break;
        }
        
        if (!placed) {
            result.optimization_status = "PARTIAL_SUCCESS";
        }
    }
    
    result.space_utilization_pct = (used_volume / container.volume()) * 100.0;
    return result;
}

}
