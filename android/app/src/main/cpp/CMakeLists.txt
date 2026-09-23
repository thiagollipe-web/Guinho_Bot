cmake_minimum_required(VERSION 3.31.6)
project(guinho_native LANGUAGES C CXX)

set(LLAMA_DIR "${CMAKE_CURRENT_LIST_DIR}/../../../../../third_party/llama.cpp")

if(NOT EXISTS "${LLAMA_DIR}/CMakeLists.txt")
    message(FATAL_ERROR "llama.cpp não encontrado em ${LLAMA_DIR}. Inicialize o submodule third_party/llama.cpp.")
endif()

set(BUILD_SHARED_LIBS ON CACHE BOOL "" FORCE)
set(LLAMA_BUILD_APP OFF CACHE BOOL "" FORCE)
set(LLAMA_BUILD_COMMON OFF CACHE BOOL "" FORCE)
set(LLAMA_OPENSSL OFF CACHE BOOL "" FORCE)
set(GGML_NATIVE OFF CACHE BOOL "" FORCE)
set(GGML_OPENMP OFF CACHE BOOL "" FORCE)
set(GGML_LLAMAFILE OFF CACHE BOOL "" FORCE)
set(GGML_BACKEND_DL ON CACHE BOOL "" FORCE)
set(GGML_CPU_ALL_VARIANTS ON CACHE BOOL "" FORCE)

add_subdirectory("${LLAMA_DIR}" "${CMAKE_BINARY_DIR}/llama.cpp" EXCLUDE_FROM_ALL)
add_library(guinho_native SHARED native_llama.cpp)
target_include_directories(guinho_native PRIVATE "${LLAMA_DIR}/include")
target_compile_features(guinho_native PRIVATE cxx_std_17)
target_link_libraries(guinho_native PRIVATE llama log android)
