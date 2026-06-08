#include <iostream>
#include <string>
#include <vector>
#include "nlohmann/json.hpp"
#include "engine.hpp"

using json = nlohmann::json;

int main() {
    // Read all of stdin into a string
    std::string inputStr(std::istreambuf_iterator<char>(std::cin), {});
    if (inputStr.empty()) {
        std::cerr << "Empty input" << std::endl;
        return 1;
    }

    try {
        auto j = json::parse(inputStr);

        // Parse Container
        seiton::Container container;
        auto j_container = j.at("target_container");
        container.max_l_cm = j_container.at("max_l_cm").get<double>();
        container.max_w_cm = j_container.at("max_w_cm").get<double>();
        container.max_h_cm = j_container.at("max_h_cm").get<double>();

        // Parse Items
        std::vector<seiton::Item> items;
        auto j_items = j.at("items_to_pack");
        for (const auto& j_item : j_items) {
            seiton::Item item;
            item.id = j_item.at("id").get<std::string>();
            item.l = j_item.at("l").get<double>();
            item.w = j_item.at("w").get<double>();
            item.h = j_item.at("h").get<double>();
            item.fragile = j_item.value("fragile", false);
            items.push_back(item);
        }

        // Call Engine
        seiton::ExecutionMatrix matrix = seiton::Engine::pack(container, items);

        // Serialize output
        json out;
        out["optimization_status"] = matrix.optimization_status;
        out["space_utilization_pct"] = matrix.space_utilization_pct;
        
        json sequence = json::array();
        for (const auto& step : matrix.sequence) {
            json step_json;
            step_json["step"] = step.step;
            step_json["item_id"] = step.item_id;
            
            json target_coords;
            target_coords["x"] = step.target_coordinates.x;
            target_coords["y"] = step.target_coordinates.y;
            target_coords["z"] = step.target_coordinates.z;
            target_coords["rotation_deg"] = step.target_coordinates.rotation_deg;
            
            step_json["target_coordinates"] = target_coords;
            sequence.push_back(step_json);
        }
        out["sequence"] = sequence;

        std::cout << out.dump(4) << std::endl;

    } catch (const std::exception& e) {
        std::cerr << "Error parsing JSON or executing engine: " << e.what() << std::endl;
        return 1;
    }

    return 0;
}
