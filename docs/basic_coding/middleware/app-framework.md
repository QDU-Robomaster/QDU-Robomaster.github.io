---
id: app-framework
title: Application 框架
sidebar_position: 1
---

# Application 框架

`Application` 框架是 LibXR 中的核心中间件之一，负责管理设备注册与应用模块调度，是 XRobot 系统集成与运行控制的基础。

## 模块组成

- **HardwareContainer**：硬件容器类，支持设备对象的注册、查找、别名管理。
- **Application**：应用模块抽象基类，需实现 `OnMonitor()` 方法。
- **ApplicationManager**：模块调度器，用于统一管理多个 Application 实例并执行周期性任务。

---

## HardwareContainer：硬件设备注册与查找

```cpp
template <typename T>
struct Entry {
  T& object;
  std::initializer_list<const char*> aliases;
};

HardwareContainer container({
  Entry<UART>{uart1, {"uart1", "console"}},
  Entry<Motor>{gpio1, {"gpio1", "LED"}}
});
```

支持：

- 多别名注册：同一个对象可注册多个别名。
- 类型安全查找：支持模板化查找 `Find<T>("alias")`。
- 查找失败断言：`FindOrExit<T>({...})` 可在未找到时报错退出。

---

## Application / ApplicationManager：统一应用模块管理

```cpp
class MyApp : public Application {
 public:
  void OnMonitor() override {
    // 用户定义的周期任务逻辑
  }
};

MyApp app;
manager.Register(app);
manager.MonitorAll();  // 周期调用所有模块的 OnMonitor()
```

支持：

- 注册任意数量的模块；
- 使用 `LockFreeList` 无锁结构存储模块；
- 可用于实现定时任务调度、模块状态轮询等。

---

## 与 XRobot 的集成意义

XRobot 系统的自动生成工具会为每个模块自动生成注册代码，统一调用 `HardwareContainer` 与 `ApplicationManager`，完成设备注册与主循环调度的构建。

这使得所有模块可插拔化接入，支持快速扩展与平台无关运行。

---

更多示例与使用方式，请参考 `xrobot_main.cpp` 或模板生成代码。
