---

id: stm32-code-gen-watchdog
title: 看门狗
sidebar_position: 12
---


# 看门狗

LibXR 支持 **STM32 独立看门狗（IWDG）** 的自动管理，包括定时喂狗任务或独立线程。推荐所有产品固件启用硬件看门狗，以提升系统可靠性。

## 基本说明

* 支持 IWDG 实例自动生成代码与配置。
* 可选自动喂狗方式：**定时任务** 或 **独立线程**，适配裸机/RTOS。
* 可通过 YAML 配置自定义喂狗周期、线程栈、优先级等参数。

## 看门狗代码示例

```cpp
// 创建并初始化看门狗实例
STM32Watchdog iwdg1(&hiwdg1, 1000, 250); // 溢出 1s，喂狗周期 250ms

// 自动喂狗（方式一：作为定时任务，适合裸机或简单轮询）
auto iwdg1_task = Timer::CreateTask(iwdg1.TaskFun, reinterpret_cast<LibXR::Watchdog *>(&iwdg1), 250);
Timer::Add(iwdg1_task);
Timer::Start(iwdg1_task);

// 自动喂狗（方式二：作为线程，适合 RTOS）
LibXR::Thread iwdg1_thread;
iwdg1_thread.Create(reinterpret_cast<LibXR::Watchdog *>(&iwdg1), iwdg1.ThreadFun, "iwdg1_wdg", 1024,
                   static_cast<LibXR::Thread::Priority>(3));
```

## 配置文件说明

通过配置文件灵活控制看门狗行为：

```yaml
# IWDG 外设启用与参数
IWDG:
  iwdg1:
    timeout_ms: 1000   # 溢出超时时间（毫秒）
    feed_interval_ms: 250       # 喂狗周期（毫秒）

# Watchdog 相关全局配置
Watchdog:
  run_as_thread: true         # 是否作为线程运行（否则定时任务）
  feed_interval_ms: 1024    # 线程栈深度（仅在线程下有效）
  thread_stack_depth: 3         # 线程优先级（仅在线程下有效）
  thread_priority: 250         # 定时任务喂狗周期（毫秒，默认250）
```

> * 若 `RunAsThread: true`，则每个启用的 IWDG 会自动生成线程，线程参数可全局配置。
> * 若 `RunAsThread: false`，则采用定时任务方式喂狗。

## 生成代码命令

修改 `.config.yaml` 后，重新生成代码：

```bash
xr_gen_code_stm32 -i ./.config.yaml -o ./User/app_main.cpp
```

## 注意事项

STM32CubeMX生成的MX_IWDG_Init()会直接使能看门狗，而且除了复位无法关闭和重新配置。可以在CubeMX中的Project Manager->Advanced Settings中关闭此函数的生成和调用
