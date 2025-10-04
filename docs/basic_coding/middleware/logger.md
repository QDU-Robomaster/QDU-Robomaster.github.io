---
id: logger
title: 日志系统
sidebar_position: 2
---

# Logger 日志系统

LibXR 中的日志系统基于 Topic 发布机制实现，支持多等级日志输出、格式化打印与终端显示颜色控制，适配嵌入式资源受限环境下的高性能日志收集。

## 模块功能

- **多级别日志分类**：支持 Debug、Info、Pass、Warn、Error 五种日志级别。
- **Topic 发布机制**：所有日志通过 Topic 机制发布，可订阅并转发至终端或其他系统。
- **彩色终端输出**：根据日志级别自动选择颜色打印。
- **编译期控制输出等级**：通过 `LIBXR_LOG_LEVEL` 宏控制编译产出与运行时输出。

---

## 使用方式

```cpp
XR_LOG_DEBUG("Debug value: %d", value);
XR_LOG_INFO("System started");
XR_LOG_PASS("Test passed");
XR_LOG_WARN("Low battery");
XR_LOG_ERROR("Sensor failure");
```

默认情况下日志将发布到 `/xr/log` 主题，并在满足等级条件下通过终端输出。

---

## 宏定义等级控制

可通过配置 `LIBXR_LOG_LEVEL` 宏定义调整编译时保留的日志等级：

| 等级 | 宏值 | 宏示例         |
|------|------|----------------|
| ERROR | 0  | `XR_LOG_ERROR(...)` |
| WARN  | 1  | `XR_LOG_WARN(...)`  |
| PASS  | 2  | `XR_LOG_PASS(...)`  |
| INFO  | 3  | `XR_LOG_INFO(...)`  |
| DEBUG | 4  | `XR_LOG_DEBUG(...)` |

未达到等级的日志宏在编译时将被优化移除。

---

## 发布机制与终端回显

- 所有日志封装为 `LogData` 结构体，通过 `Logger::Publish()` 发布。
- 注册的回调函数会自动将日志格式化后输出到终端 `STDIO::write_`。
- 支持中断安全调用，适配嵌入式场景下的日志记录需求。

---

## 与其他中间件的集成

Logger 自动与 Topic 系统集成，可将日志同步转发到远程终端、文件系统或网络接口中。常与 Terminal/RamFS 联合用于 CLI 系统调试。

---

更多信息请参考 `logger.hpp` 与 `logger.cpp` 源文件。
