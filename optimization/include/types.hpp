#pragma once

#include <string>
#include <vector>

namespace seiton {

// 3D Spatial Coordinate
struct Coordinate {
    double x;
    double y;
    double z;
};

// Coordinate mapping with rotation state, matching "Execution Matrix" output
struct TargetCoordinate : public Coordinate {
    int rotation_deg;
    double l;
    double w;
    double h;
};

// Item representing a box to be packed
struct Item {
    std::string id;
    double l;
    double w;
    double h;
    
    // Constraints for physical equilibrium and stacking rules
    bool fragile;
    
    // Helper calculation for volume
    [[nodiscard]] double volume() const { 
        return l * w * h; 
    }

    // Helper calculation for base area (used as alternative sorting metric)
    [[nodiscard]] double base_area() const {
        return l * w;
    }
};

// Target container constraints matching "Optimization Request Payload"
struct Container {
    double max_l_cm;
    double max_w_cm;
    double max_h_cm;
    
    [[nodiscard]] double volume() const {
        return max_l_cm * max_w_cm * max_h_cm;
    }
};

// Execution mapping for a single placement step
struct Step {
    int step;
    std::string item_id;
    TargetCoordinate target_coordinates;
};

// Final Payload for the Execution Matrix
struct ExecutionMatrix {
    std::string optimization_status;
    double space_utilization_pct;
    std::vector<Step> sequence;
};

} 
