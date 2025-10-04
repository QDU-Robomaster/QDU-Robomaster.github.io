---
id: logger
title: Logger System
sidebar_position: 2
---

# Logger System

The logging system in LibXR is implemented based on the Topic publish mechanism. It supports multi-level log output, formatted printing, and terminal color control, making it suitable for high-performance logging in resource-constrained embedded environments.

## Module Features

- **Multi-level log classification**: Supports Debug, Info, Pass, Warn, and Error log levels.
- **Topic-based publishing**: All logs are published via the Topic system and can be subscribed to and forwarded to terminals or other systems.
- **Colorful terminal output**: Automatically selects print color based on log level.
- **Compile-time log level control**: The `LIBXR_LOG_LEVEL` macro controls both compiled output and runtime log visibility.

---

## Usage

```cpp
XR_LOG_DEBUG("Debug value: %d", value);
XR_LOG_INFO("System started");
XR_LOG_PASS("Test passed");
XR_LOG_WARN("Low battery");
XR_LOG_ERROR("Sensor failure");
```

By default, logs are published to the `/xr/log` topic and printed to the terminal if the level condition is met.

---

## Macro Level Control

You can configure the `LIBXR_LOG_LEVEL` macro to control the compiled log level:

| Level | Value | Macro Example         |
|-------|--------|------------------------|
| ERROR | 0      | `XR_LOG_ERROR(...)`    |
| WARN  | 1      | `XR_LOG_WARN(...)`     |
| PASS  | 2      | `XR_LOG_PASS(...)`     |
| INFO  | 3      | `XR_LOG_INFO(...)`     |
| DEBUG | 4      | `XR_LOG_DEBUG(...)`    |

Logs below the set level will be optimized out during compilation.

---

## Publishing Mechanism & Terminal Echo

- All logs are encapsulated in the `LogData` structure and published via `Logger::Publish()`.
- Registered callback functions automatically format and print logs to the terminal via `STDIO::write_`.
- Supports interrupt-safe invocation to meet logging needs in embedded contexts.

---

## Integration with Other Middleware

Logger is automatically integrated with the Topic system and can forward logs to remote terminals, file systems, or network interfaces. It's commonly used with Terminal/RamFS for CLI system debugging.

---

For more details, refer to the `logger.hpp` and `logger.cpp` source files.
