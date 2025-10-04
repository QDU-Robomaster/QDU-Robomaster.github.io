---
id: power
title: 电源管理
sidebar_position: 10
---

# Power（电源管理）

`LibXR::PowerManager` 提供统一的电源管理接口，适用于实现系统复位、关机或进入低功耗模式等功能，供平台或电源控制驱动实现。

## 接口定义

```cpp
class PowerManager {
public:
  PowerManager() = default;
  virtual ~PowerManager() = default;

  // 系统复位操作（由子类实现具体逻辑）
  virtual void Reset() = 0;

  // 系统关机操作（由子类实现具体逻辑）
  virtual void Shutdown() = 0;
};
```

## 使用说明

- `Reset()` 可用于软复位控制器、重新启动系统等；
- `Shutdown()` 用于关机、掉电、进入睡眠等低功耗控制；
- 可用于平台的电源按钮、远程命令、低电量策略等情境；
- 由具体平台实现其底层行为，接口保持一致，便于移植与抽象封装。
