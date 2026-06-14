#include "../include/engine.hpp"
#include <cmath>

namespace seiton {

ExecutionMatrix Engine::pack(const Container& container, std::vector<Item> items, bool incremental_mode) {
    ExecutionMatrix result;
    result.optimization_status = "SUCCESS";
    
    if (!incremental_mode) {
        Sorter::sortItemsFFD(items);
    }
    
    std::vector<Coordinate> eps;
    eps.push_back({0.0, 0.0, 0.0});
    
    std::vector<PlacedItem> placed_items;
    double used_volume = 0.0;
    int step_counter = 1;
    
    for (const auto& item : items) {
        bool placed = false;
        
        // 6 possible orientations (LWH, WLH, LHW, HLW, WHL, HWL)
        std::vector<Item> orientations = {
            {item.id, item.l, item.w, item.h, item.fragile},
            {item.id, item.w, item.l, item.h, item.fragile},
            {item.id, item.l, item.h, item.w, item.fragile},
            {item.id, item.h, item.l, item.w, item.fragile},
            {item.id, item.w, item.h, item.l, item.fragile},
            {item.id, item.h, item.w, item.l, item.fragile}
        };

        // Sort EPs (Z, then Y, then X) for packing heuristic, rounding to mm (1e-3) to absorb float inaccuracies
        // using a strict weak ordering mapping to guarantee std::sort stability.
        std::sort(eps.begin(), eps.end(), [](const Coordinate& a, const Coordinate& b){
            long long za = std::round(a.z * 1000.0);
            long long zb = std::round(b.z * 1000.0);
            if (za != zb) return za < zb;
            
            long long ya = std::round(a.y * 1000.0);
            long long yb = std::round(b.y * 1000.0);
            if (ya != yb) return ya < yb;
            
            long long xa = std::round(a.x * 1000.0);
            long long xb = std::round(b.x * 1000.0);
            return xa < xb;
        });
        
        for (auto it = eps.begin(); it != eps.end(); ++it) {
            Coordinate ep = *it;
            
            for (size_t r = 0; r < orientations.size(); ++r) {
                const Item& rot_item = orientations[r];

                // Check container boundaries with epsilon tolerance
                if (ep.x + rot_item.l > container.max_l_cm + 1e-4 ||
                    ep.y + rot_item.w > container.max_w_cm + 1e-4 ||
                    ep.z + rot_item.h > container.max_h_cm + 1e-4) {
                    continue;
                }
                
                if (!EPMath::noCollision(rot_item, ep, placed_items)) continue;
                if (!EPMath::validateFragility(rot_item, ep, placed_items)) continue;
                if (!EPMath::validateEquilibrium(rot_item, ep, placed_items)) continue;
                
                // Valid placement
                placed = true;
                placed_items.push_back({rot_item, ep});
                used_volume += rot_item.volume();
                
                TargetCoordinate tc;
                tc.x = ep.x;
                tc.y = ep.y;
                tc.z = ep.z;
                tc.rotation_deg = 0; // Not explicitly mapping degrees to the frontend right now, just providing the swapped L/W/H
                tc.l = rot_item.l;
                tc.w = rot_item.w;
                tc.h = rot_item.h;
                
                result.sequence.push_back(Step{
                    step_counter++,
                    item.id,
                    tc
                });
                
                eps.erase(it);
                
                auto new_eps = EPMath::generateNewEPs(ep, rot_item, container);
                for (const auto& nep : new_eps) {
                    eps.push_back(nep);
                }
                break; // Break the orientation loop
            }
            if (placed) break; // Break the EP loop if placed
        }
        
        if (!placed) {
            result.optimization_status = "PARTIAL_SUCCESS";
        }
    }
    
    result.space_utilization_pct = (used_volume / container.volume()) * 100.0;
    return result;
}

}
