---
id: event
title: 事件系统
sidebar_position: 3
---

# Event 事件系统

`Event` 类是 LibXR 中用于事件驱动机制的核心中间件，支持事件注册、事件触发、中断安全调用与事件绑定，是构建嵌入式任务协作的重要工具。

## 模块功能

- 基于 **事件 ID** 注册多个回调；
- 支持 **线程/中断上下文触发**；
- 可通过 `GetList()` 实现 **中断上下文安全事件触发**；
- 支持 **事件桥接绑定**，用于跨模块事件流转；
- 内部采用 **红黑树 + 无锁链表** 实现高效、并发安全存储。

---

## 快速使用

### 注册事件回调

```cpp
int counter = 0;
LibXR::Event evt;
auto cb = LibXR::Event::Callback::Create(
    [](bool, int *cnt, uint32_t event) {
        (*cnt)++;
        ASSERT(event == 0x10);
    },
    &counter);

evt.Register(0x10, cb);
```

### 触发事件

```cpp
evt.Active(0x10);  // 普通线程上下文触发
```

### 中断上下文触发（需提前获取回调链表）

```cpp
// 在非回调中获取事件链表
auto list = evt.GetList(0x1234);
// 在回调中触发
evt.ActiveFromCallback(list, 0x1234);
```

### 事件绑定

```cpp
evt_dst.Bind(evt_src, 0xA, 0xB);  // 当 evt_src 的事件 0xA 触发时，会激活 evt_dst 的事件 0xB
```

---

## 类定义结构

- `Event::Register(event, cb)`：注册回调；
- `Event::Active(event)`：非中断触发；
- `Event::ActiveFromCallback(list, event)`：中断上下文安全触发；
- `Event::GetList(event)`：获取并缓存事件链表；
- `Event::Bind(src, id_src, id_dst)`：实现事件桥接；
- 内部使用 `RBTree<uint32_t>` 管理事件映射，事件对应回调使用 `LockFreeList` 存储。

---

## 示例：测试事件绑定与触发

```cpp
int arg = 0;
auto cb = Event::Callback::Create([](bool, int* a, uint32_t e) {
  *a += 1;
}, &arg);

Event e1, e2;
e1.Register(0x1234, cb);
e1.Active(0x1234);  // arg += 1
e2.Bind(e1, 0x4321, 0x1234);
e2.Active(0x4321);  // arg += 1
```

---

## 应用场景

- 按键/传感器中断触发事件；
- 多任务协作中的状态通知；
- 与 Topic/Message 联动构建事件-消息系统。

---

更多信息请查阅 `event.hpp` 源码。
