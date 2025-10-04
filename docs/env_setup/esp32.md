---
id: env-setup-esp32
title: ESP32环境配置
sidebar_position: 3
---

# ESP32 环境配置

ESP的官方教程已经足够完善：[ESP-IDF Getting Started](https://docs.espressif.com/projects/esp-idf/zh_CN/latest/esp32c3/get-started/index.html)，根据教程安装即可。

## 工程CMake配置

libxr提供了[esp32-cmake](https://github.com/Jiu-xiao/libxr/blob/master/CMake/esp32.cmake)的CMake配置，可以直接使用libxr的CMake配置。
对于ESP官方的Hello World工程，请在main/CMakeLists.txt最后添加：

```cmake
include(path_to_libxr/CMake/esp32.cmake)
```

即可完成CMake配置，注意将path_to_libxr的路径替换为你的libxr路径。
