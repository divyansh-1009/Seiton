cmake_minimum_required(VERSION 3.14)
project(SeitonOptimizationEngine VERSION 1.0.0 LANGUAGES CXX)

# Enforce C++17 standard for the modern features we used
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# Export compile_commands.json for editor/LSP support
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

# Fetch nlohmann/json dependency at build time
include(FetchContent)
FetchContent_Declare(
    json
    URL https://github.com/nlohmann/json/releases/download/v3.11.3/json.tar.xz
)
FetchContent_MakeAvailable(json)

# Define the compute tier as a library
add_library(seiton_engine STATIC
    src/engine.cpp
    src/ep_math.cpp
    src/sorter.cpp
)

# Specify the include directories so other modules can easily link and include
target_include_directories(seiton_engine PUBLIC
    $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}/include>
    $<INSTALL_INTERFACE:include>
)

# Link JSON library to seiton_engine
target_link_libraries(seiton_engine PUBLIC nlohmann_json::nlohmann_json)

# Add the main executable
add_executable(optimization_engine src/main.cpp)
target_link_libraries(optimization_engine PRIVATE seiton_engine)
