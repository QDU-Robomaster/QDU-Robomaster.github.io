---
id: watchdog
title: 看门狗
sidebar_position: 12
---

# Watchdog（看门狗）

`LibXR::Watchdog` 提供通用看门狗（Watchdog）抽象接口，支持配置溢出时间、自动喂狗周期等参数，并提供启动、停止和手动喂狗等控制接口，适配多线程和定时任务等不同运行环境。

## 接口概览

### 配置结构体

```cpp
struct Configuration {
  uint32_t timeout_ms;  // 看门狗溢出时间（毫秒）
  uint32_t feed_ms;     // 自动喂狗周期（毫秒）
};
```

### 构造与配置

```cpp
Watchdog();
virtual ~Watchdog();

virtual ErrorCode SetConfig(const Configuration& config) = 0;
```

### 控制接口

```cpp
virtual ErrorCode Start() = 0;
virtual ErrorCode Stop() = 0;
virtual ErrorCode Feed() = 0;
```

### 自动喂狗辅助函数

```cpp
static void ThreadFun(Watchdog* wdg);
static void TaskFun(Watchdog* wdg);
```

- `ThreadFun`：用于线程环境中的自动喂狗循环；
- `TaskFun`：适用于定时轮询任务系统中的自动喂狗函数。

## 特性总结

- 支持设置溢出时间与自动喂狗周期；
- 提供手动 `Feed` 接口与自动喂狗辅助函数；
- 适用于多种嵌入式运行模型（如 RTOS 线程、定时任务）；
- 平台无关，便于在不同硬件平台上统一使用；
- 可扩展，派生类实现具体底层驱动逻辑。
